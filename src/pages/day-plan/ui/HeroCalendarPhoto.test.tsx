import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { CalendarWidgetRenderReadyContext } from '../model/calendarWidgetRenderReady';

it('keeps a displayed photo visible on rerenders and waits for the replacement to display', () => {
  const ready = jest.fn();
  const render = (uri: string) => <CalendarWidgetRenderReadyContext.Provider value={ready}><HeroCalendarPhoto uri={uri} /></CalendarWidgetRenderReadyContext.Provider>;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render('file:///first.jpg')); });
  const image = () => tree.root.findAll(node => !!node.props.onDisplay && !!node.props.source)[0];
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' }).length).toBeGreaterThan(0);
  act(() => image().props.onDisplay());
  expect(ready).toHaveBeenCalledTimes(1);
  act(() => tree.update(render('file:///first.jpg')));
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' })).toHaveLength(0);
  expect(image().props.transition).toBe(0);
  expect(image().props.cachePolicy).toBe('memory-disk');
  act(() => tree.update(render('file:///second.jpg')));
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' }).length).toBeGreaterThan(0);
  expect(image().props.recyclingKey).toBe('file:///second.jpg');
  act(() => image().props.onDisplay());
  expect(tree.root.findAllByProps({ testID: 'calendar-photo-skeleton' })).toHaveLength(0);
  act(() => tree.unmount());
});
