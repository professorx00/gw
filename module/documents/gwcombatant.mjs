export default class GWCombatant extends Combatant {
  _getInitiativeFormula = function () {
    console.log(this.actor);
    return `1d12+1${this.actor.system.init}`;
  };

  _onCreate(data, options, userId) {
    super._onCreate(data, options, userId);

    // if (this.isOwner) {
    //   this.rollInitiative();
    // }
  }
  _rollInitiative(formula) {
    console.log(formula);
  }
}
