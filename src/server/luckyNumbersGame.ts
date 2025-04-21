export default class LuckyNumbersGame {
    public LuckyNumbers: { [id: string]: number } = {}
  
    public GetWinners(number: number): string[] {
      const winners = []
      
      for (let id in this.LuckyNumbers) {
        if (number === this.LuckyNumbers[id]) {
          winners.push(id)
        }
      }
      return winners
    }
  }