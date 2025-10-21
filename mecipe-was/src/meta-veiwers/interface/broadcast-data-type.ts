export interface ClientMessage {
    type: string;
    timestamp: number;
    data: any;
    clientId: string;
}

export interface BroadcastData {
    roomId: string;
    timestamp: number;
    messages: ClientMessage[];
}

export enum RoomDataMessageType {
    PLAYER_TRANSFORM = 'playerTransform',
    PLAYER_ANIMATION = 'playerAnimation',
    CUSTOM_EVENT = 'customEvent',
}