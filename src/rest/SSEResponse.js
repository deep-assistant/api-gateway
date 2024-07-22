export class SSEResponse {
  static sendJSONEvent(value) {
    return `data: ${JSON.stringify(value)}\n\n`;
  }

  constructor(sseFn) {
    this.sseFn = sseFn;
  }

  write(res) {
    this.sseFn(res);
  }
}
