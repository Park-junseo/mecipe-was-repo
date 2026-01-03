/**
 * Common logging utility
 */
export class CommonLogger {
  static log(context: string, message: string, ...args: any[]) {
    console.log(`[${context}] ${message}`, ...args);
  }

  static error(context: string, message: string, error?: any) {
    console.error(`[${context}] ${message}`, error);
  }

  static warn(context: string, message: string, ...args: any[]) {
    console.warn(`[${context}] ${message}`, ...args);
  }
}





