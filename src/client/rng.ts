import { io } from 'socket.io-client'

const socket = io('/rng')

socket.on('connect', () => {
  document.body.innerText = 'Connected : ' + socket.id
})

socket.on('message', (message) => {
  document.body.innerHTML += '<p>' + message + '</p>'
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
})