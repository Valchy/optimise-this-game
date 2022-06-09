import { useAnimationFrame } from 'framer-motion';
import { useRef, MouseEvent } from 'react';
import s from './ui/styles.module.css';
import { initialState } from './game/state';
import { onMouseClick, onMouseMove, playSound } from './game/actions';
import { update } from './game/gameplay';
import { useKonami } from 'react-konami-code';

export default () => {
	const gameState = useRef(initialState());

	useKonami(() => {
		gameState.current.konami = true;
		window.alert('Game cheats unlocked!');
	});

	const mouseMove = (event: MouseEvent) => {
		onMouseMove(gameState.current, event.clientX, event.clientY);
	};

	const mouseClick = () => {
		if (gameState.current.konami && !gameState.current.rapidFire) {
			let shotCount = 0;
			gameState.current.rapidFire = true;

			const rapidFire = setInterval(() => {
				if (gameState.current.isGameOver) clearInterval(rapidFire);

				if (shotCount === 0) playSound('shoot.mp3');
				else if (shotCount === 5) shotCount = 0;
				else shotCount++;

				onMouseClick(gameState.current);
			}, 100);
		} else {
			if (!gameState.current.isGameOver) playSound('shoot.mp3');
			onMouseClick(gameState.current);
		}
	};

	useAnimationFrame(time => {
		update(gameState.current, time / 1000);
	});

	return (
		<div className={s.scene} onMouseMove={mouseMove} onClick={mouseClick}>
			<div className={s.levelBg} ref={el => (gameState.current.levelBgEl = el)} />
			<div className={s.turret}>
				<div className={s.barrel} ref={el => (gameState.current.barrelEl = el)} />
			</div>
			<div ref={el => (gameState.current.entityContainerEl = el)} />
			<div className={s.status} ref={el => (gameState.current.statusEl = el)} />
			<div className={s.modal} ref={el => (gameState.current.modalEl = el)}>
				Game Over
			</div>
		</div>
	);
};
