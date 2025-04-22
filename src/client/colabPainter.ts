import { io } from 'socket.io-client'

const socket = io('/colabPainter')

socket.on('draw', (message) => {
  prevX = message[0]
  prevY = message[1]
  currX = message[2]
  currY = message[3]
  color = message[4]
  draw()
})

let prevX = 0,
  currX = 0,
  prevY = 0,
  currY = 0

let color = 'black'
const thickness = 10

const canvas = document.getElementById('canvas') as HTMLCanvasElement
canvas.width = window.innerWidth
canvas.height = window.innerHeight

const ctx = canvas.getContext('2d') as CanvasRenderingContext2D

window.addEventListener('resize', function () {
  if (window.innerWidth > 0 && window.innerHeight > 0) {
    const data = ctx.getImageData(0, 0, window.innerWidth, window.innerHeight)
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    ctx.putImageData(data, 0, 0)
  }
})

const greenButton = document.getElementById('greenButton') as HTMLDivElement
greenButton.addEventListener('click', () => {
  color = 'green'
})
const blueButton = document.getElementById('blueButton') as HTMLDivElement
blueButton.addEventListener('click', () => {
  color = 'blue'
})
const redButton = document.getElementById('redButton') as HTMLDivElement
redButton.addEventListener('click', () => {
  color = 'red'
})
const yellowButton = document.getElementById('yellowButton') as HTMLDivElement
yellowButton.addEventListener('click', () => {
  color = 'yellow'
})
const orangeButton = document.getElementById('orangeButton') as HTMLDivElement
orangeButton.addEventListener('click', () => {
  color = 'orange'
})
const blackButton = document.getElementById('blackButton') as HTMLDivElement
blackButton.addEventListener('click', () => {
  color = 'black'
})
const whiteButton = document.getElementById('whiteButton') as HTMLDivElement
whiteButton.addEventListener('click', () => {
  color = 'white'
})
const resetButton = document.getElementById('resetButton') as HTMLButtonElement
resetButton.addEventListener('click', () => {
  reset()
})

canvas.addEventListener('mousemove', (e) => {
  if (e.buttons) {
    prevX = currX
    prevY = currY
    currX = e.clientX - canvas.getBoundingClientRect().left
    currY = e.clientY - canvas.getBoundingClientRect().top
    draw()

    socket.emit('draw', [prevX, prevY, currX, currY, color])
  }
})
canvas.addEventListener('mousedown', (e) => {
  currX = e.clientX - canvas.getBoundingClientRect().left
  currY = e.clientY - canvas.getBoundingClientRect().top
})
canvas.addEventListener('mouseenter', (e) => {
  currX = e.clientX - canvas.getBoundingClientRect().left
  currY = e.clientY - canvas.getBoundingClientRect().top
})

function draw() {
  ctx.beginPath()
  ctx.moveTo(prevX, prevY)
  ctx.lineTo(currX, currY)
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.stroke()
  ctx.closePath()
}

function reset() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}