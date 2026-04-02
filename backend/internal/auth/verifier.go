package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	Subject  string
	Username string
	Role     string
	Key      string
}

type TokenVerifier interface {
	VerifyToken(ctx context.Context, token string) (*Claims, error)
}

type VerificationMode string

const (
	ModeIntrospection VerificationMode = "introspection"
	ModeJWKS          VerificationMode = "jwks"
)

type Config struct {
	Mode                VerificationMode
	IntrospectionURL    string
	IntrospectionMethod string
	JWKSURL             string
	ExpectedIssuer      string
	ExpectedAudience    string
	HTTPTimeout         time.Duration
	JWKSCacheTTL        time.Duration
}

func LoadConfigFromEnv() (Config, error) {
	mode := VerificationMode(strings.TrimSpace(os.Getenv("AUTH_VERIFICATION_MODE")))
	if mode == "" {
		mode = ModeIntrospection
	}

	cfg := Config{
		Mode:                mode,
		IntrospectionURL:    strings.TrimSpace(os.Getenv("AUTH_INTROSPECTION_URL")),
		IntrospectionMethod: strings.ToUpper(strings.TrimSpace(os.Getenv("AUTH_INTROSPECTION_METHOD"))),
		JWKSURL:             strings.TrimSpace(os.Getenv("AUTH_JWKS_URL")),
		ExpectedIssuer:      strings.TrimSpace(os.Getenv("AUTH_EXPECTED_ISSUER")),
		ExpectedAudience:    strings.TrimSpace(os.Getenv("AUTH_EXPECTED_AUDIENCE")),
		HTTPTimeout:         5 * time.Second,
		JWKSCacheTTL:        5 * time.Minute,
	}

	if cfg.IntrospectionMethod == "" {
		cfg.IntrospectionMethod = http.MethodGet
	}

	if timeout := strings.TrimSpace(os.Getenv("AUTH_HTTP_TIMEOUT_SECONDS")); timeout != "" {
		seconds, err := strconv.Atoi(timeout)
		if err != nil || seconds <= 0 {
			return Config{}, fmt.Errorf("invalid AUTH_HTTP_TIMEOUT_SECONDS: %q", timeout)
		}
		cfg.HTTPTimeout = time.Duration(seconds) * time.Second
	}

	if ttl := strings.TrimSpace(os.Getenv("AUTH_JWKS_CACHE_TTL_SECONDS")); ttl != "" {
		seconds, err := strconv.Atoi(ttl)
		if err != nil || seconds <= 0 {
			return Config{}, fmt.Errorf("invalid AUTH_JWKS_CACHE_TTL_SECONDS: %q", ttl)
		}
		cfg.JWKSCacheTTL = time.Duration(seconds) * time.Second
	}

	switch cfg.Mode {
	case ModeIntrospection:
		if cfg.IntrospectionURL == "" {
			base := strings.TrimRight(strings.TrimSpace(os.Getenv("AUTH_SERVICE_URL")), "/")
			if base == "" {
				return Config{}, errors.New("AUTH_SERVICE_URL or AUTH_INTROSPECTION_URL is required for introspection mode")
			}
			cfg.IntrospectionURL = base + "/api/me"
		}
	case ModeJWKS:
		if cfg.JWKSURL == "" {
			return Config{}, errors.New("AUTH_JWKS_URL is required for jwks mode")
		}
	default:
		return Config{}, fmt.Errorf("unsupported AUTH_VERIFICATION_MODE: %q", cfg.Mode)
	}

	return cfg, nil
}

func NewVerifier(cfg Config) (TokenVerifier, error) {
	switch cfg.Mode {
	case ModeIntrospection:
		return &introspectionVerifier{
			url:    cfg.IntrospectionURL,
			method: cfg.IntrospectionMethod,
			client: &http.Client{Timeout: cfg.HTTPTimeout},
		}, nil
	case ModeJWKS:
		return &jwksVerifier{
			url:        cfg.JWKSURL,
			issuer:     cfg.ExpectedIssuer,
			audience:   cfg.ExpectedAudience,
			cacheTTL:   cfg.JWKSCacheTTL,
			httpClient: &http.Client{Timeout: cfg.HTTPTimeout},
			keys:       map[string]*rsa.PublicKey{},
		}, nil
	default:
		return nil, fmt.Errorf("unsupported verification mode: %q", cfg.Mode)
	}
}

func ExtractBearerToken(header string) (string, error) {
	if header == "" {
		return "", errors.New("missing bearer token")
	}
	if !strings.HasPrefix(header, "Bearer ") {
		return "", errors.New("invalid authorization scheme")
	}
	token := strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
	if token == "" {
		return "", errors.New("missing bearer token")
	}
	return token, nil
}

type introspectionVerifier struct {
	url    string
	method string
	client *http.Client
}

func (v *introspectionVerifier) VerifyToken(ctx context.Context, token string) (*Claims, error) {
	var req *http.Request
	var err error

	switch v.method {
	case http.MethodPost:
		form := url.Values{}
		form.Set("token", token)
		req, err = http.NewRequestWithContext(ctx, http.MethodPost, v.url, strings.NewReader(form.Encode()))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	default:
		req, err = http.NewRequestWithContext(ctx, http.MethodGet, v.url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("auth verification request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return nil, errors.New("invalid token")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("auth verification failed with status %d", resp.StatusCode)
	}

	var payload map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("failed to decode auth verification response: %w", err)
	}

	if active, exists := payload["active"]; exists {
		if isActive, ok := active.(bool); !ok || !isActive {
			return nil, errors.New("inactive token")
		}
	}

	return claimsFromPayload(payload), nil
}

type jwksVerifier struct {
	url        string
	issuer     string
	audience   string
	cacheTTL   time.Duration
	httpClient *http.Client

	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey
	fetchedAt time.Time
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (v *jwksVerifier) VerifyToken(ctx context.Context, token string) (*Claims, error) {
	parserOptions := []jwt.ParserOption{}
	if v.issuer != "" {
		parserOptions = append(parserOptions, jwt.WithIssuer(v.issuer))
	}
	if v.audience != "" {
		parserOptions = append(parserOptions, jwt.WithAudience(v.audience))
	}

	parsed, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}

		kid, _ := t.Header["kid"].(string)
		return v.keyFor(ctx, kid)
	}, parserOptions...)
	if err != nil {
		return nil, fmt.Errorf("jwt verification failed: %w", err)
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid jwt claims")
	}

	return claimsFromPayload(map[string]any(claims)), nil
}

func (v *jwksVerifier) keyFor(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	if key := v.cachedKey(kid); key != nil {
		return key, nil
	}

	if err := v.refresh(ctx); err != nil {
		return nil, err
	}

	key := v.cachedKey(kid)
	if key == nil {
		return nil, fmt.Errorf("no jwk found for kid %q", kid)
	}
	return key, nil
}

func (v *jwksVerifier) cachedKey(kid string) *rsa.PublicKey {
	v.mu.RLock()
	defer v.mu.RUnlock()

	if time.Since(v.fetchedAt) > v.cacheTTL {
		return nil
	}
	if kid != "" {
		return v.keys[kid]
	}
	if len(v.keys) == 1 {
		for _, key := range v.keys {
			return key
		}
	}
	return nil
}

func (v *jwksVerifier) refresh(ctx context.Context) error {
	v.mu.Lock()
	defer v.mu.Unlock()

	if time.Since(v.fetchedAt) <= v.cacheTTL && len(v.keys) > 0 {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.url, nil)
	if err != nil {
		return err
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("jwks fetch failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("jwks fetch returned status %d", resp.StatusCode)
	}

	var payload jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return fmt.Errorf("failed to decode jwks: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(payload.Keys))
	for _, key := range payload.Keys {
		if key.Kty != "RSA" {
			continue
		}

		pub, err := rsaPublicKeyFromJWK(key)
		if err != nil {
			return err
		}

		keys[key.Kid] = pub
	}

	if len(keys) == 0 {
		return errors.New("no RSA keys found in jwks")
	}

	v.keys = keys
	v.fetchedAt = time.Now()
	return nil
}

func rsaPublicKeyFromJWK(key jwk) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, fmt.Errorf("failed to decode jwk modulus: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, fmt.Errorf("failed to decode jwk exponent: %w", err)
	}

	var exponent int
	for _, b := range eBytes {
		exponent = exponent<<8 + int(b)
	}

	if exponent == 0 {
		return nil, errors.New("invalid jwk exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: exponent,
	}, nil
}

func claimsFromPayload(payload map[string]any) *Claims {
	return &Claims{
		Subject:  firstString(payload, "sub", "id", "user_id"),
		Username: firstString(payload, "username", "preferred_username", "name"),
		Role:     firstString(payload, "role"),
		Key:      firstString(payload, "key"),
	}
}

func firstString(payload map[string]any, keys ...string) string {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok || value == nil {
			continue
		}

		switch typed := value.(type) {
		case string:
			return typed
		case float64:
			return strconv.FormatInt(int64(typed), 10)
		case json.Number:
			return typed.String()
		}
	}
	return ""
}
