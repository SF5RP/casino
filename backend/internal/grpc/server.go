package grpc

import (
	"context"
	"log"
	"time"

	"casino-backend/internal/database"
	"casino-backend/internal/models"
	pb "casino-backend/proto"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// RouletteGRPCServer реализует gRPC сервис для рулетки
type RouletteGRPCServer struct {
	pb.UnimplementedRouletteServiceServer
	repo      database.RouletteRepositoryInterface
	jwtSecret []byte
}

// NewRouletteGRPCServer создает новый gRPC сервер для рулетки
func NewRouletteGRPCServer(repo database.RouletteRepositoryInterface, jwtSecret string) *RouletteGRPCServer {
	return &RouletteGRPCServer{
		repo:      repo,
		jwtSecret: []byte(jwtSecret),
	}
}

// authenticateToken проверяет JWT токен из метаданных
func (s *RouletteGRPCServer) authenticateToken(ctx context.Context) (string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", status.Error(codes.Unauthenticated, "missing metadata")
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		return "", status.Error(codes.Unauthenticated, "missing authorization token")
	}

	tokenString := tokens[0]
	if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
		tokenString = tokenString[7:]
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, status.Error(codes.Unauthenticated, "unexpected signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return "", status.Error(codes.Unauthenticated, "invalid token")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if key, ok := claims["key"].(string); ok {
			return key, nil
		}
	}

	return "", status.Error(codes.Unauthenticated, "invalid token claims")
}

// convertToProtoNumber конвертирует models.RouletteNumber в pb.RouletteNumber
func convertToProtoNumber(number models.RouletteNumber) *pb.RouletteNumber {
	switch v := number.(type) {
	case float64:
		return &pb.RouletteNumber{
			Value: &pb.RouletteNumber_IntValue{IntValue: int32(v)},
		}
	case string:
		return &pb.RouletteNumber{
			Value: &pb.RouletteNumber_StringValue{StringValue: v},
		}
	default:
		return nil
	}
}

// convertFromProtoNumber конвертирует pb.RouletteNumber в models.RouletteNumber
func convertFromProtoNumber(protoNumber *pb.RouletteNumber) models.RouletteNumber {
	if protoNumber == nil {
		return nil
	}

	switch v := protoNumber.Value.(type) {
	case *pb.RouletteNumber_IntValue:
		return v.IntValue
	case *pb.RouletteNumber_StringValue:
		return v.StringValue
	default:
		return nil
	}
}

// convertToProtoSession конвертирует models.RouletteSession в pb.RouletteSession
func convertToProtoSession(session *models.RouletteSession) *pb.RouletteSession {
	if session == nil {
		return nil
	}

	protoSession := &pb.RouletteSession{
		Id:        int32(session.ID),
		Key:       session.Key,
		CreatedAt: timestamppb.New(session.CreatedAt),
		UpdatedAt: timestamppb.New(session.UpdatedAt),
	}

	// Конвертируем историю
	for _, number := range session.History {
		if protoNumber := convertToProtoNumber(number); protoNumber != nil {
			protoSession.History = append(protoSession.History, protoNumber)
		}
	}

	return protoSession
}

// AuthenticateRoom реализует аутентификацию в комнате
func (s *RouletteGRPCServer) AuthenticateRoom(ctx context.Context, req *pb.AuthenticateRoomRequest) (*pb.AuthenticateRoomResponse, error) {
	if req.Key == "" {
		return &pb.AuthenticateRoomResponse{
			Success: false,
			Message: "Key is required",
		}, nil
	}

	session, err := s.repo.GetSession(req.Key)
	if err != nil {
		log.Printf("Error getting session %s: %v", req.Key, err)
		return &pb.AuthenticateRoomResponse{
			Success: false,
			Message: "Internal server error",
		}, nil
	}

	// Если сессии не существует, создаем ее
	if session == nil {
		log.Printf("Session %s not found, creating new one.", req.Key)
		session, err = s.repo.CreateSessionWithPassword(req.Key, req.Password)
		if err != nil {
			log.Printf("Error creating session %s: %v", req.Key, err)
			return &pb.AuthenticateRoomResponse{
				Success: false,
				Message: "Failed to create session",
			}, nil
		}
	} else {
		// Сессия существует, проверяем пароль, если он установлен
		if session.Password != "" {
			valid, err := s.repo.ValidateSessionPassword(req.Key, req.Password)
			if err != nil {
				log.Printf("Error validating password for session %s: %v", req.Key, err)
				return &pb.AuthenticateRoomResponse{
					Success: false,
					Message: "Internal server error during password validation",
				}, nil
			}
			if !valid {
				return &pb.AuthenticateRoomResponse{
					Success: false,
					Message: "Invalid password",
				}, nil
			}
		}
	}

	// Генерируем JWT токен
	claims := jwt.MapClaims{
		"key": req.Key,
		"exp": time.Now().Add(time.Hour * 24).Unix(), // Токен живет 24 часа
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return &pb.AuthenticateRoomResponse{
			Success: false,
			Message: "Failed to create token",
		}, nil
	}

	return &pb.AuthenticateRoomResponse{
		Success: true,
		Token:   tokenString,
		Message: "Authentication successful",
	}, nil
}

// GetHistory получает историю чисел для комнаты
func (s *RouletteGRPCServer) GetHistory(ctx context.Context, req *pb.GetHistoryRequest) (*pb.GetHistoryResponse, error) {
	// Проверяем авторизацию
	authKey, err := s.authenticateToken(ctx)
	if err != nil {
		return nil, err
	}

	if req.Key != authKey {
		return nil, status.Error(codes.PermissionDenied, "access denied to this room")
	}

	session, err := s.repo.GetSession(req.Key)
	if err != nil {
		log.Printf("Error getting session: %v", err)
		return &pb.GetHistoryResponse{
			Success: false,
			Message: "Internal server error",
		}, nil
	}

	var history []*pb.RouletteNumber
	if session != nil {
		for _, number := range session.History {
			if protoNumber := convertToProtoNumber(number); protoNumber != nil {
				history = append(history, protoNumber)
			}
		}
	}

	return &pb.GetHistoryResponse{
		Success: true,
		History: history,
		Message: "History retrieved successfully",
	}, nil
}

// SaveNumber сохраняет новое число в комнате
func (s *RouletteGRPCServer) SaveNumber(ctx context.Context, req *pb.SaveNumberRequest) (*pb.SaveNumberResponse, error) {
	// Проверяем авторизацию
	authKey, err := s.authenticateToken(ctx)
	if err != nil {
		return nil, err
	}

	if req.Key != authKey {
		return nil, status.Error(codes.PermissionDenied, "access denied to this room")
	}

	number := convertFromProtoNumber(req.Number)
	if number == nil {
		return &pb.SaveNumberResponse{
			Success: false,
			Message: "Invalid number format",
		}, nil
	}

	session, err := s.repo.AddNumberToSession(req.Key, number)
	if err != nil {
		log.Printf("Error saving number: %v", err)
		return &pb.SaveNumberResponse{
			Success: false,
			Message: "Internal server error",
		}, nil
	}

	return &pb.SaveNumberResponse{
		Success: true,
		Session: convertToProtoSession(session),
		Message: "Number saved successfully",
	}, nil
}

// UpdateHistory обновляет историю чисел в комнате
func (s *RouletteGRPCServer) UpdateHistory(ctx context.Context, req *pb.UpdateHistoryRequest) (*pb.UpdateHistoryResponse, error) {
	// Проверяем авторизацию
	authKey, err := s.authenticateToken(ctx)
	if err != nil {
		return nil, err
	}

	if req.Key != authKey {
		return nil, status.Error(codes.PermissionDenied, "access denied to this room")
	}

	// Конвертируем историю
	var history []models.RouletteNumber
	for _, protoNumber := range req.History {
		if number := convertFromProtoNumber(protoNumber); number != nil {
			history = append(history, number)
		}
	}

	// Проверяем валидность истории
	if !isValidHistory(history) {
		return &pb.UpdateHistoryResponse{
			Success: false,
			Message: "Invalid history format",
		}, nil
	}

	session, err := s.repo.UpdateSessionHistory(req.Key, history)
	if err != nil {
		log.Printf("Error updating history: %v", err)
		return &pb.UpdateHistoryResponse{
			Success: false,
			Message: "Internal server error",
		}, nil
	}

	return &pb.UpdateHistoryResponse{
		Success: true,
		Session: convertToProtoSession(session),
		Message: "History updated successfully",
	}, nil
}

// GetSessions получает все сессии (только для админов)
func (s *RouletteGRPCServer) GetSessions(ctx context.Context, req *pb.GetSessionsRequest) (*pb.GetSessionsResponse, error) {
	// Проверяем авторизацию (можно расширить для админских прав)
	_, err := s.authenticateToken(ctx)
	if err != nil {
		return nil, err
	}

	sessions, err := s.repo.GetAllSessions()
	if err != nil {
		log.Printf("Error getting sessions: %v", err)
		return &pb.GetSessionsResponse{
			Success: false,
			Message: "Internal server error",
		}, nil
	}

	var protoSessions []*pb.RouletteSession
	for _, session := range sessions {
		protoSessions = append(protoSessions, convertToProtoSession(session))
	}

	return &pb.GetSessionsResponse{
		Success:  true,
		Sessions: protoSessions,
		Message:  "Sessions retrieved successfully",
	}, nil
}

// StreamNumbers реализует потоковую передачу чисел в реальном времени
func (s *RouletteGRPCServer) StreamNumbers(req *pb.StreamNumbersRequest, stream pb.RouletteService_StreamNumbersServer) error {
	// Проверяем авторизацию
	authKey, err := s.authenticateToken(stream.Context())
	if err != nil {
		return err
	}

	if req.Key != authKey {
		return status.Error(codes.PermissionDenied, "access denied to this room")
	}

	// Получаем текущую историю
	session, err := s.repo.GetSession(req.Key)
	if err != nil {
		log.Printf("Error getting session for stream: %v", err)
		return status.Error(codes.Internal, "failed to get session")
	}

	var history []*pb.RouletteNumber
	if session != nil {
		for _, number := range session.History {
			if protoNumber := convertToProtoNumber(number); protoNumber != nil {
				history = append(history, protoNumber)
			}
		}
	}

	// Отправляем начальную историю
	err = stream.Send(&pb.NumberStream{
		Event: &pb.NumberStream_HistoryUpdate{
			HistoryUpdate: &pb.NumberHistoryUpdate{
				History:  history,
				Version:  1,
				FullSync: true,
			},
		},
	})
	if err != nil {
		return err
	}

	// Отправляем ping каждые 30 секунд для поддержания соединения
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			err := stream.Send(&pb.NumberStream{
				Event: &pb.NumberStream_Ping{
					Ping: &pb.PingEvent{
						Timestamp: timestamppb.New(time.Now()),
					},
				},
			})
			if err != nil {
				log.Printf("Error sending ping: %v", err)
				return err
			}
		case <-stream.Context().Done():
			log.Printf("Stream closed for room %s", req.Key)
			return nil
		}
	}
}

// isValidHistory проверяет валидность истории чисел
func isValidHistory(history []models.RouletteNumber) bool {
	if history == nil {
		return true // Пустая история валидна
	}

	for _, number := range history {
		if !isValidRouletteNumber(number) {
			return false
		}
	}
	return true
}

// isValidRouletteNumber проверяет валидность отдельного числа рулетки
func isValidRouletteNumber(number models.RouletteNumber) bool {
	switch v := number.(type) {
	case float64:
		// Проверяем, что это валидное целое число от 0 до 36
		if v != float64(int(v)) {
			return false // Не целое число
		}
		intVal := int(v)
		return intVal >= 0 && intVal <= 36
	case string:
		// Только "00" разрешено как строка
		return v == "00"
	default:
		return false
	}
}

// RegisterGRPCServer регистрирует gRPC сервис
func RegisterGRPCServer(s *grpc.Server, repo database.RouletteRepositoryInterface, jwtSecret string) {
	grpcServer := NewRouletteGRPCServer(repo, jwtSecret)
	pb.RegisterRouletteServiceServer(s, grpcServer)
}