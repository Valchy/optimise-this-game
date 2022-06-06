import './styles.css';
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const LazyHomePage = lazy(() => import('./scenes/HomePage'));
const LazyVideoGame = lazy(() => import('./scenes/VideoGame'));

export default function App() {
	return (
		<Suspense fallback={null}>
			<Routes>
				<Route path="/" element={<LazyHomePage />} />
				<Route path="/game" element={<LazyVideoGame />} />
			</Routes>
		</Suspense>
	);
}
