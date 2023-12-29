export default class GWCombat extends Combat {
  /**
   * Reset all initiatives at top of new round
   */
  async nextRound() {
    this.combatants.forEach((c) => {
      c.rollInitiative();
    });

    super.nextRound();
  }
}
