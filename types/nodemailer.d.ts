declare module "nodemailer" {
  export type Transporter = {
    sendMail: (mail: unknown) => Promise<unknown>
  }

  export interface CreateTransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: {
      user?: string
      pass?: string
    }
  }

  export function createTransport(options: CreateTransportOptions): Transporter

  const nodemailer: {
    createTransport: typeof createTransport
  }

  export default nodemailer
}
