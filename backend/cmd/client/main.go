package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	pb "casino-backend/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

func main() {
	// Получаем адрес сервера из аргументов или используем по умолчанию
	serverAddr := "localhost:8012"
	if len(os.Args) > 1 {
		serverAddr = os.Args[1]
	}

	// Подключаемся к gRPC серверу
	conn, err := grpc.Dial(serverAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to gRPC server: %v", err)
	}
	defer conn.Close()

	client := pb.NewRouletteServiceClient(conn)

	// Пример использования клиента
	fmt.Println("=== Casino gRPC Client Demo ===")
	fmt.Printf("Connected to server: %s\n\n", serverAddr)

	// 1. Аутентификация в комнате
	roomKey := "demo-room"
	roomPassword := ""

	fmt.Printf("1. Authenticating in room: %s\n", roomKey)
	authResp, err := client.AuthenticateRoom(context.Background(), &pb.AuthenticateRoomRequest{
		Key:      roomKey,
		Password: roomPassword,
	})
	if err != nil {
		log.Fatalf("Authentication failed: %v", err)
	}

	if !authResp.Success {
		log.Fatalf("Authentication failed: %s", authResp.Message)
	}

	fmt.Printf("✅ Authentication successful!\n")
	fmt.Printf("Token: %s\n\n", authResp.Token[:50]+"...")

	// Создаем контекст с токеном для авторизованных запросов
	token := authResp.Token
	ctx := metadata.NewOutgoingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+token))

	// 2. Получение истории
	fmt.Println("2. Getting current history...")
	historyResp, err := client.GetHistory(ctx, &pb.GetHistoryRequest{
		Key:   roomKey,
		Token: token,
	})
	if err != nil {
		log.Fatalf("Failed to get history: %v", err)
	}

	if !historyResp.Success {
		log.Fatalf("Failed to get history: %s", historyResp.Message)
	}

	fmt.Printf("✅ History retrieved! Found %d numbers:\n", len(historyResp.History))
	for i, number := range historyResp.History {
		fmt.Printf("  %d: %s\n", i+1, formatRouletteNumber(number))
	}
	fmt.Println()

	// 3. Сохранение новых чисел
	fmt.Println("3. Adding new numbers to the table...")
	testNumbers := []int32{7, 14, 21, 0, 36}

	for _, num := range testNumbers {
		fmt.Printf("Adding number: %d\n", num)
		saveResp, err := client.SaveNumber(ctx, &pb.SaveNumberRequest{
			Key:   roomKey,
			Token: token,
			Number: &pb.RouletteNumber{
				Value: &pb.RouletteNumber_IntValue{IntValue: num},
			},
		})
		if err != nil {
			log.Printf("Failed to save number %d: %v", num, err)
			continue
		}

		if !saveResp.Success {
			log.Printf("Failed to save number %d: %s", num, saveResp.Message)
			continue
		}

		fmt.Printf("✅ Number %d saved successfully!\n", num)
		time.Sleep(500 * time.Millisecond) // Небольшая задержка для демонстрации
	}
	fmt.Println()

	// 4. Получение обновленной истории
	fmt.Println("4. Getting updated history...")
	updatedHistoryResp, err := client.GetHistory(ctx, &pb.GetHistoryRequest{
		Key:   roomKey,
		Token: token,
	})
	if err != nil {
		log.Fatalf("Failed to get updated history: %v", err)
	}

	if !updatedHistoryResp.Success {
		log.Fatalf("Failed to get updated history: %s", updatedHistoryResp.Message)
	}

	fmt.Printf("✅ Updated history! Now has %d numbers:\n", len(updatedHistoryResp.History))
	for i, number := range updatedHistoryResp.History {
		fmt.Printf("  %d: %s\n", i+1, formatRouletteNumber(number))
	}
	fmt.Println()

	// 5. Тестирование потокового соединения
	fmt.Println("5. Testing streaming connection...")
	fmt.Println("Starting number stream (will run for 10 seconds)...")

	streamCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	stream, err := client.StreamNumbers(streamCtx, &pb.StreamNumbersRequest{
		Key:   roomKey,
		Token: token,
	})
	if err != nil {
		log.Printf("Failed to start stream: %v", err)
	} else {
		for {
			msg, err := stream.Recv()
			if err != nil {
				fmt.Printf("Stream ended: %v\n", err)
				break
			}

			switch event := msg.Event.(type) {
			case *pb.NumberStream_NewNumber:
				fmt.Printf("📢 New number received: %s\n", formatRouletteNumber(event.NewNumber))
			case *pb.NumberStream_HistoryUpdate:
				fmt.Printf("📊 History update: %d numbers (version %d, full_sync: %t)\n",
					len(event.HistoryUpdate.History),
					event.HistoryUpdate.Version,
					event.HistoryUpdate.FullSync)
			case *pb.NumberStream_Ping:
				fmt.Printf("🏓 Ping received at %s\n", event.Ping.Timestamp.AsTime().Format("15:04:05"))
			case *pb.NumberStream_Error:
				fmt.Printf("❌ Error: %s (code: %s)\n", event.Error.Message, event.Error.Code)
			}
		}
	}

	fmt.Println("\n=== Demo completed successfully! ===")
}

// formatRouletteNumber форматирует число рулетки для вывода
func formatRouletteNumber(number *pb.RouletteNumber) string {
	if number == nil {
		return "nil"
	}

	switch v := number.Value.(type) {
	case *pb.RouletteNumber_IntValue:
		if v.IntValue == 0 {
			return "0 (Green)"
		}
		if v.IntValue <= 10 || (v.IntValue >= 19 && v.IntValue <= 28) {
			if v.IntValue%2 == 0 {
				return fmt.Sprintf("%d (Black)", v.IntValue)
			}
			return fmt.Sprintf("%d (Red)", v.IntValue)
		}
		if v.IntValue >= 11 && v.IntValue <= 18 {
			if v.IntValue%2 == 0 {
				return fmt.Sprintf("%d (Red)", v.IntValue)
			}
			return fmt.Sprintf("%d (Black)", v.IntValue)
		}
		if v.IntValue >= 29 && v.IntValue <= 36 {
			if v.IntValue%2 == 0 {
				return fmt.Sprintf("%d (Black)", v.IntValue)
			}
			return fmt.Sprintf("%d (Red)", v.IntValue)
		}
		return strconv.Itoa(int(v.IntValue))
	case *pb.RouletteNumber_StringValue:
		if v.StringValue == "00" {
			return "00 (Green)"
		}
		return v.StringValue
	default:
		return "unknown"
	}
}