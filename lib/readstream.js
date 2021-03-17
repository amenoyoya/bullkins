module.exports = {
  /**
   * ReadableStream から文字列を返す
   * @param {ReadableStream} stdin: 基本的には process.stdin を指定
   * @return {string}
   */
  stringify: async stdin => {
    const buffers = []
    for await (const chunk of stdin) buffers.push(chunk)
    return Buffer.concat(buffers)
  },
}