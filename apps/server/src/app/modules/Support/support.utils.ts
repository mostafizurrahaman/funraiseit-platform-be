import { Support } from 'packages/db/src'

export const generateTicketNumber = (): string => {
  const date = new Date()

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let randomPart = ''

  for (let i = 0; i < 6; i++) {
    randomPart += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return `TKT-${year}${month}${day}-${randomPart}`
}

export const getUniqueTicket = async (): Promise<string> => {
  let ticketNo = ''
  let exists = true

  while (exists) {
    const newTicket = generateTicketNumber()

    const existingTicket = await Support.exists({
      ticketNo: newTicket,
    })

    if (!existingTicket) {
      ticketNo = newTicket
      exists = false
    }
  }

  return ticketNo
}
