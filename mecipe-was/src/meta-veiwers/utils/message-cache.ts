import { ClientMessage } from "../interface/broadcast-data-type";

export class MessageCache {
    private readonly messageCache = new Map<string, Map<string, any[]>>(); // clientId -> {key: type, value: data[]}

    setMessageCache(clientId: string, type: string, data: ClientMessage, overwrite: boolean = false) {
        if (!this.messageCache.has(clientId)) {
            this.messageCache.set(clientId, new Map<string, ClientMessage[]>());
        }
        let cache: ClientMessage[];
        if (overwrite) {
            cache = [data];
        } else {
            cache = this.messageCache.get(clientId).get(type);
            if (cache) {
                if (cache.length >= maxCacheSize) {
                    cache.shift();
                }
                cache.push(data);
            } else {
                cache = [data];
            }
        }

        this.messageCache.get(clientId).set(type, cache);
    }

    getClientMessageCache(clientId: string, type: string): ClientMessage[] {
        if (!this.messageCache.has(clientId)) {
            return [];
        }
        return this.messageCache.get(clientId).get(type) as ClientMessage[];
    }

    getAllClientMessageCache(type: string): ClientMessage[] {
        return [...this.messageCache.values()].flatMap(cache => cache.get(type) as ClientMessage[]);
    }

    clearMessageCache(clientId: string, type: string) {
        this.messageCache.get(clientId)?.delete(type);

        if (this.messageCache.get(clientId)?.size === 0) {
            this.messageCache.delete(clientId);
        }
    }

}

export const maxCacheSize = 1000;