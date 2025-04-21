import { io } from 'socket.io-client'

type ScreenName = {
  name: string
  abbreviation: string
}

type ChatMessage = {
  message: string
  from: string
}

let screenName: ScreenName

const messageList = document.getElementById('messageList') as HTMLOListElement
const messageText = document.getElementById('messageText') as HTMLInputElement
const sendButton = document.getElementById('sendButton') as HTMLButtonElement

const socket = io()

socket.on('connect', () => {
  console.log('connect')
})

socket.on('disconnect', (message) => {
  console.log('disconnect ' + message)
})

socket.on('screenName', (message: ScreenName) => {
  screenName = message;
  (document.getElementsByClassName('screenName')[0] as HTMLSpanElement).innerText =
    screenName.name
})

socket.on('chatMessage', (message: ChatMessage) => {
  const li = document.createElement('li')
  li.innerHTML =
    "<span class='circle' style='float: right;'>" +
    message.from +
    "</span><div class='otherMessage'>" +
    message.message +
    '</div>'
  messageList.appendChild(li)

  scrollChatWindow()
})

socket.on('systemMessage', (message) => {
  const li = document.createElement('li')
  li.innerHTML = "<div class='systemMessage'>" + message + '</div>'
  messageList.appendChild(li)

  scrollChatWindow()
})

messageText.addEventListener('keypress', (e) => {
  if (e.code === 'Enter') {
    sendMessage()
    return false
  }
})

function sendMessage() {
  if (messageText.value.length > 0) {
    socket.emit('chatMessage', <ChatMessage>{
      message: messageText.value,
      from: screenName.abbreviation
    })

    const li = document.createElement('li')
    li.innerHTML =
      "<span class='circle' style='float: left;'>" +
      screenName.abbreviation +
      "</span><div class='myMessage'>" +
      messageText.value +
      '</div>'
    messageList.appendChild(li)

    messageText.value = ''

    scrollChatWindow()
  }
}

sendButton.addEventListener('click', () => {
  sendMessage()
})

function scrollChatWindow() {
  const count = document.querySelectorAll('#messageList li').length
  if (count > 10) {
    messageList.removeChild(messageList.firstChild as HTMLLIElement)
  }

  messageList.scrollTo({ top: messageList.scrollHeight, behavior: 'smooth' })
}