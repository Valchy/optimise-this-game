import { createEnemy, scoreFromEnemy } from './entities';
import { addEntity, killAllEntities, killEntity, removeDeadEntities } from './state';
import { Enemy, Shot, GameState } from './types';
import { createLevel, levelBackgrounds } from './levels';
import { bonusScore, shotDimensions, enemyWidth, enemyHeight } from './constants';
import { getSnakePosition } from './utils';
import { playSound } from './actions';

/**
 * The main update function. Runs during each animation frame, runs the whole game play loop
 * and updates entites on screen.
 */
export function update(state: GameState, updateTime: number) {
	// The updateTime is basically how many seconds since the user opened the game URL.
	// This can be useful for some things. For others it's more useful to have a delta
	// since the last update.
	const delta = updateTime - state.lastUpdateTime;
	state.lastUpdateTime = updateTime;

	// Check if there's a new enemy spawning.
	checkSpawn(state, updateTime);

	// Update the rotation of the barrel.
	updateBarrel(state);

	// Move all entities.
	updateEntities(state, updateTime, delta);

	// Check if there are collisions, either between entities (shots and enemies) or between entities
	// and the screen boundaries.
	checkCollisions(state, delta);

	// Update some misc UI elements.
	if (state.gameInit || (state.isGameOver && state.modalTime <= 0)) {
		state.gameInit = false;
		updateUI(state, delta);
	}
}

/**
 * Check if it's time to spawn a new enemy.
 *
 * Each level has a queue of enemySpawns which we spawn in order. Each EnemySpawn can specify its
 * own delay after the previous spawn.
 */
function checkSpawn(state: GameState, updateTime: number) {
	// Don't spawn anything when modals are open.
	if (state.modalTime > 0) {
		return;
	}

	const { enemySpawns, lastSpawnTime } = state;
	const enemySpawn = enemySpawns[0];

	// Is it time yet?
	if (enemySpawn && updateTime - lastSpawnTime > enemySpawn.delay) {
		// Yes it is!
		state.lastSpawnTime = updateTime;
		enemySpawns.shift();

		addEntity(state, createEnemy(enemySpawn, updateTime));
	}
}

/**
 * Update the barrel rotation.
 * @param state
 */
function updateBarrel(state: GameState) {
	if (state.barrelEl) {
		state.barrelEl.style.transform = `rotate(${state.barrelAngle + Math.PI / 2}rad)`;
	}
}

/**
 * Move each entity according to their movement rules.
 */
function updateEntities(state: GameState, updateTime: number, delta: number) {
	const windowHeight = window.innerHeight;

	state.entities.forEach(entity => {
		// Shots go in a straight direction based on their velocity.
		if (entity.type === 'shot') {
			entity.x = entity.x + entity.velocity.x * delta;
			entity.y = entity.y + entity.velocity.y * delta;
			entity.spin += 1;

			entity.el.style.transform = `translate(${entity.x}px, ${entity.y}px) rotateZ(${entity.spin}deg)`;
		} else if (entity.type === 'enemy') {
			// Enemies move differently based on their variant.
			const { speed, variant } = entity.enemySpawn;

			// Normal and "sine" enemies generally move down according to some speed.
			if (variant === 'normal' || variant === 'sine') {
				entity.y = entity.y + windowHeight * entity.enemySpawn.speed * delta;
			}

			// Additionally, "sine" enemies move in a sine wave pattern.
			if (variant === 'sine') {
				entity.x =
					entity.enemySpawn.position.x +
					Math.sin((updateTime * entity.enemySpawn.sineSpeed * windowHeight) / 100) * entity.enemySpawn.sineRadius;
			}

			// Finally, "snake" enemies move according to predefined lines across the screen.
			if (variant === 'snake') {
				const { x, y } = getSnakePosition(entity.enemySpawn.lines, updateTime - entity.spawnTime, speed);
				entity.x = x;
				entity.y = y;
			}

			// Translate the entity to its new position
			entity.el.style.transform = `translate(${entity.x}px, ${entity.y}px)`;
		}
	});
}

/**
 * Collision detection. How fun!
 */
function checkCollisions(state: GameState, delta: number) {
	const windowWidth = window.innerWidth;
	const windowHeight = window.innerHeight;
	const enemies: Enemy[] = [];
	const shots: Shot[] = [];

	// Filter out all dead enemies and shots outside scope
	state.entities.forEach(entity => {
		// Check if the entity is colliding with the screen boundaries.
		const outsideBounds =
			entity.type === 'shot'
				? // Shots collide with all boundaries.
				  entity.y > windowHeight || entity.y + shotDimensions < 0 || entity.x > windowWidth || entity.x + shotDimensions < 0
				: // Enemies only collide with bottom of screen.
				  entity.y > windowHeight;

		// Delete entity if outside bounds
		if (outsideBounds) {
			if (entity.type === 'enemy') {
				// Oh no!
				loseLive(state);
			} else {
				// Basically a shot hitting the edge... Nothing dramatic.
				killEntity(entity);
			}

			// Update some misc UI elements.
			updateUI(state, delta);
		} else {
			if (entity.type === 'enemy') enemies.push(entity);
			else shots.push(entity);
		}
	});

	// Check for collisions between shots and enemies
	shots.forEach(shot => {
		// Check if the entity is colliding with other entities.
		enemies.forEach(enemy => {
			// Ignore "dead" entities ... (we'll clean them up right after).
			if (enemy.dead) return;

			// Such simple code, but still capable of causing a migraine. 🙃
			const hit = !(enemy.x > shot.x || enemy.x + enemyWidth < shot.x || enemy.y > shot.y || enemy.y + enemyHeight < shot.y);

			// If hit kill the enemy and shot
			if (hit) {
				// Yay!
				killEntity(shot);
				killEntity(enemy);
				state.score += scoreFromEnemy(enemy, state.konami);

				checkEndLevel(state);

				// Update some misc UI elements.
				updateUI(state, delta);
			}
		});
	});

	// Filter dead entities.
	removeDeadEntities(state);
}

/**
 * Update misc UI elements.
 */
function updateUI(state: GameState, delta: number) {
	// Update the gameplay status UI.
	if (state.statusEl) {
		state.statusEl.innerText = `Level: ${state.level}\nLives: ${state.lives}\nScore: ${state.score}`;
	}

	// Show and hide the modal.
	if (state.modalEl) {
		state.modalEl.style.opacity = state.modalTime ? '1' : '0';
	}

	// Counting down while a modal is open until the game starts again. Note, the end-game modals have
	// a modalTime of Number.MAX_VALUE. It's fine! :D
	if (state.modalTime) {
		state.modalTime = Math.max(0, state.modalTime - delta);
	}
}

/**
 * Oh no, an enemy has hit the bottom of the screen.
 * @param state
 */
function loseLive(state: GameState) {
	// A life has been lost. :(
	state.lives--;

	// Maybe even game over?
	if (state.lives === 0) {
		state.enemySpawns = [];
		state.isGameOver = true;

		playSound('defeat.mp3');
		showModal(
			state,
			`
			<h1>Game Over!</h1>
			<p>Score: ${state.score}</p>
			<p>${state.konami ? 'Since you cheated, reload to play again NORMALLY!' : 'Click to play again :)'}</p>
		`,
			Number.MAX_VALUE
		);
	} else {
		playSound('life-loss.mp3');
		showModal(state, `<h1>Whoops!</h1>`, 2);

		// "reload" the same level with all of the remaining enemies.
		const activeEnemies = state.entities
			.filter(entity => entity.type === 'enemy' && !entity.dead)
			.map(entity => (entity as Enemy).enemySpawn);

		state.enemySpawns = [...activeEnemies, ...state.enemySpawns];
	}

	killAllEntities(state);
}

/**
 * Check if we've reached the end of the level. This function is run immediately after a shot hits an enemy.
 */
function checkEndLevel(state: GameState) {
	const enemiesRemaining = state.enemySpawns.length || state.entities.some(entity => entity.type === 'enemy' && !entity.dead);

	// Nah, still some enemies to be killed. Keep playing!
	if (enemiesRemaining) {
		return;
	}

	// Calculate some stats for the modal.
	const accuracy = state.enemyCount / state.shotCount;
	const accuracyPretty = Math.round(accuracy * 100);
	const bonus = Math.round(bonusScore * accuracy);
	showModal(state, `<h1>Level ${state.level} finished!</h1><p>Shot accuracy: ${accuracyPretty}%</p><p>Bonus points: ${bonus}</p>`);

	// Clean up the previous level.
	killAllEntities(state);
	state.score += bonus;
	state.shotCount = 0;

	// Load the next level.
	state.level++;
	state.enemySpawns = createLevel(state.level);
	state.enemyCount = state.enemySpawns.length;
	if (state.levelBgEl) {
		state.levelBgEl.style.backgroundColor = levelBackgrounds[state.level];
	}

	// Or end the game.
	if (state.enemySpawns.length === 0) {
		playSound('victory.mp3');
		showModal(
			state,
			`<h1>Congratulations!</h1>
			<p>You won the game!</p>
			<p>Total score: ${state.score}</p>
			<p>${state.konami ? 'Since you cheated, reload to play again NORMALLY!' : 'Click to play again :)'}</p>`,
			Number.MAX_VALUE
		);
		state.isGameOver = true;
	}
}

/**
 * Shows a modal. This HTML is put into a modal which fades in and out after `time` seconds.
 */
function showModal(state: GameState, html: string, time = 5) {
	if (state.modalEl) {
		state.modalEl.innerHTML = html;
	}
	state.modalTime = time;
}
