import { ClientMessage } from "./broadcast-data-type";

export interface RoomDataQueue {
    [roomId: string]: Array<ClientMessage>;
}