import { Logger } from "@nestjs/common";

export default class SocketLogger extends Logger {
    constructor(context: string = "socket") {
        super(context);
    }

    private tempContext: string = this.context;

    /**
     * @description 컨텍스트 설정 (SetContext)
     * @param context 
     * @returns this
     */
    setCtx(context: string) {
        this.tempContext = `${this.context} [${context}]`;
        return this;
    }

    log(message: string) {
        super.log(message, this.tempContext);
        return this;
    }

    error(message: string) {
        super.error(message, this.tempContext);
        return this;
    }

    warn(message: string) {
        super.warn(message, this.tempContext);
        return this;
    }
}