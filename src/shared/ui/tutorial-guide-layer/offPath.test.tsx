import { Keyboard } from 'react-native';
import { setTutorialOffPathHandler, tutorialOffPathAsk } from './offPath';

afterEach(() => { setTutorialOffPathHandler(null); jest.restoreAllMocks(); });
it('dismisses the keyboard before asking to leave the tutorial on a background tap', () => {
  const ask = jest.fn();
  setTutorialOffPathHandler(ask);
  const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  tutorialOffPathAsk();
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(ask).not.toHaveBeenCalled();
  visible.mockReturnValue(false);
  tutorialOffPathAsk();
  expect(ask).toHaveBeenCalledTimes(1);
});
