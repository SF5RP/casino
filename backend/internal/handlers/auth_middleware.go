package handlers

import (
    "context"
    "net/http"
    "os"
    "strings"

    "github.com/golang-jwt/jwt/v5"
    "github.com/gorilla/mux"
)

type contextKey string

const (
    contextKeyUserID contextKey = "auth_user_id"
    contextKeyRole   contextKey = "auth_user_role"
)

// NewJWTMiddleware validates Authorization: Bearer <token> using HS256 and puts claims into context
func NewJWTMiddleware(secret []byte) mux.MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Allow unauthenticated OPTIONS
            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusOK)
                return
            }

            authHeader := r.Header.Get("Authorization")
            if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
                http.Error(w, "missing bearer token", http.StatusUnauthorized)
                return
            }

            tokenString := strings.TrimPrefix(authHeader, "Bearer ")
            token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
                // Enforce HS256
                if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                    return nil, jwt.ErrTokenUnverifiable
                }
                // Prefer env if provided at runtime (keeps in sync with Auth service secret)
                if env := os.Getenv("JWT_SECRET"); env != "" {
                    return []byte(env), nil
                }
                return secret, nil
            })

            if err != nil || !token.Valid {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }

            claims, ok := token.Claims.(jwt.MapClaims)
            if !ok {
                http.Error(w, "invalid claims", http.StatusUnauthorized)
                return
            }

            userID, _ := claims["sub"].(string)
            role, _ := claims["role"].(string)

            ctx := context.WithValue(r.Context(), contextKeyUserID, userID)
            ctx = context.WithValue(ctx, contextKeyRole, role)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// RequireRoleMiddleware ensures that the user's role is one of allowed roles
func RequireRoleMiddleware(allowedRoles ...string) mux.MiddlewareFunc {
    allowed := make(map[string]struct{}, len(allowedRoles))
    for _, r := range allowedRoles {
        allowed[r] = struct{}{}
    }

    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // OPTIONS passthrough
            if r.Method == http.MethodOptions {
                w.WriteHeader(http.StatusOK)
                return
            }

            role, _ := r.Context().Value(contextKeyRole).(string)
            if _, ok := allowed[role]; !ok {
                http.Error(w, "forbidden", http.StatusForbidden)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

// Helpers to access context values in handlers if needed
func GetUserID(r *http.Request) string {
    v, _ := r.Context().Value(contextKeyUserID).(string)
    return v
}

func GetUserRole(r *http.Request) string {
    v, _ := r.Context().Value(contextKeyRole).(string)
    return v
}

