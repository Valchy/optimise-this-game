import { getBarrelPosition } from './utils';
import { barrelMaxDegrees } from './constants';
import { createShot } from './entities';
import { GameState } from './types';
import { addEntity, restartGame } from './state';

/**
 * Update the game state with a new mouse position.
 */
export const onMouseMove = (state: GameState, x: number, y: number) => {
	const barrelPos = getBarrelPosition();
	const barrelMaxRadians = (barrelMaxDegrees * Math.PI) / 180;

	state.barrelAngle = Math.min(
		-Math.PI / 2 + barrelMaxRadians,
		Math.max(-Math.PI / 2 - barrelMaxRadians, Math.atan2(y - barrelPos.y, x - barrelPos.x))
	);
};

/**
 * Update the game state from a mouse click.
 */
export function onMouseClick(state: GameState) {
	if (state.isGameOver && !state.konami) return restartGame(state);
	if (state.modalTime > 0) return;

	state.shotCount++;
	addEntity(state, createShot(state.barrelAngle));
}

// Play sound
export function playSound(soundUrl: string) {
	const audio = new Audio(soundUrl);
	audio.play();
}
