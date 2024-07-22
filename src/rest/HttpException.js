export class HttpException {
  constructor(status, message) {
    this.status = status;
    this.message = message;
  }
}
