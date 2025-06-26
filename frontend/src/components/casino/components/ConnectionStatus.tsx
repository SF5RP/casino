import React from 'react';
import styled from '@emotion/styled';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  onReconnect?: () => void;
}

const StatusContainer = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  z-index: 1001;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  
  &:hover {
    transform: scale(1.2);
  }
`;

const ConnectedStatus = styled(StatusContainer)`
  background: #22c55e;
`;

const DisconnectedStatus = styled(StatusContainer)`
  background: #ef4444;
`;

const ReconnectingStatus = styled(StatusContainer)`
  background: #f59e0b;
  animation: pulse 1.5s ease-in-out infinite;
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.1);
    }
  }
`;

const Tooltip = styled.div<{ visible: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: ${props => props.visible ? 1 : 0};
  visibility: ${props => props.visible ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  z-index: 1002;
  
  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 8px;
    border: 4px solid transparent;
    border-bottom-color: rgba(0, 0, 0, 0.9);
  }
`;

const ReconnectButton = styled.button`
  background: #ff4444;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 4px;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: #ff6666;
  }
`;

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
                                                                    isConnected,
                                                                    isReconnecting,
                                                                    reconnectAttempts,
                                                                    onReconnect
                                                                  }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const getStatusContent = () => {
    if (isReconnecting) {
      const getText = () => {
        if (reconnectAttempts <= 3) {
          return `Переподключение... (попытка ${reconnectAttempts})`;
        } else if (reconnectAttempts <= 7) {
          return `Переподключение... (${reconnectAttempts}) - проверьте сеть`;
        } else {
          return `Переподключение... (${reconnectAttempts}) - проблемы с сервером`;
        }
      };

      return {
        Component: ReconnectingStatus,
        text: getText(),
        title: getText()
      };
    }

    if (isConnected) {
      return {
        Component: ConnectedStatus,
        text: 'Подключено',
        title: 'WebSocket подключен'
      };
    }

    return {
      Component: DisconnectedStatus,
      text: 'Нет соединения',
      title: 'WebSocket отключен'
    };
  };

  const { Component, text, title } = getStatusContent();

  return (
    <Component
      title={title}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Tooltip visible={showTooltip}>
        {text}
        {!isConnected && !isReconnecting && onReconnect && (
          <ReconnectButton onClick={onReconnect}>
            Переподключить
          </ReconnectButton>
        )}
      </Tooltip>
    </Component>
  );
}; 