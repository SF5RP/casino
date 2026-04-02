package handlers

import (
	"context"
	"net/http"

	"casino-backend/internal/auth"
	"github.com/gorilla/mux"
)

type contextKey string

const (
	contextKeyUserID   contextKey = "auth_user_id"
	contextKeyUsername contextKey = "auth_username"
	contextKeyRole     contextKey = "auth_user_role"
)

// NewJWTMiddleware validates Authorization: Bearer <token> via auth-service verifier.
func NewJWTMiddleware(verifier auth.TokenVerifier) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow unauthenticated OPTIONS
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}

			tokenString, err := auth.ExtractBearerToken(r.Header.Get("Authorization"))
			if err != nil {
				http.Error(w, err.Error(), http.StatusUnauthorized)
				return
			}

			claims, err := verifier.VerifyToken(r.Context(), tokenString)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), contextKeyUserID, claims.Subject)
			ctx = context.WithValue(ctx, contextKeyUsername, claims.Username)
			ctx = context.WithValue(ctx, contextKeyRole, claims.Role)
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

func GetUsername(r *http.Request) string {
	v, _ := r.Context().Value(contextKeyUsername).(string)
	return v
}

func GetUserRole(r *http.Request) string {
	v, _ := r.Context().Value(contextKeyRole).(string)
	return v
}
