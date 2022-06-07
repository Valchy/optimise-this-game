import s from './Hero.module.css';

export const Hero = () => {
	return (
		<section className={s.container}>
			<figure className={s.figure}>
				<img className={s.image} width={300} height={400} loading="eager" decoding="sync" src="bg.jpg" alt="" />
			</figure>
			<div className={s.center}>
				<h1 className={s.title}>Star fighter</h1>
				<a className={s.button} href="/game">
					Start
				</a>
			</div>
		</section>
	);
};

export default Hero;
