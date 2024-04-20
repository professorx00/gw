export default class GWCombatant extends Combatant {
  _getInitiativeFormula = function () {
    let num = Math.random()
    return `1d13+${this.actor.system.movement}+${num}`;
  };

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);

    if (this.isOwner) {
      this.rollInitiative();
    }
  }
  _rollInitiative(formula) {
    console.log(formula);
  }
}
