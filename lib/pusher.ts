import PusherServer from "pusher"
import PusherClient from "pusher-js"

// Validação das variáveis de ambiente do Pusher
if (
  !process.env.PUSHER_APP_ID ||
  !process.env.NEXT_PUBLIC_PUSHER_KEY ||
  !process.env.PUSHER_SECRET ||
  !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
) {
  throw new Error("As variáveis de ambiente do Pusher não estão configuradas corretamente.")
}

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
})

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  enabledTransports: ["ws", "wss"],
  // SECURITY: Authorization endpoint for private/presence channels
  authEndpoint: "/api/pusher/auth",
  auth: {
    headers: {
      // Cookies are automatically sent with same-origin requests
      // JWT token in cookie will be used for authorization
    },
  },
})
