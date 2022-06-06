import { Hero, Section, SectionList, Container } from './components';
import { lazy, Suspense } from 'react';

const LazyForm = lazy(() => import('./components/Form'));

const sections = Array(10)
	.fill(null)
	.map((_, i) => i);

export default () => {
	return (
		<>
			<Hero />
			<Container>
				<SectionList>
					{sections.map(section => (
						<Section key={section}></Section>
					))}
				</SectionList>
				<Suspense fallback={<div>Loading form...</div>}>
					<LazyForm />
				</Suspense>
			</Container>
		</>
	);
};
