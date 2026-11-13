import React from 'react';
import {Text as RNText} from 'react-native';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {useLoadingGate} from '@shared/designsystem/components/useLoadingGate';

let latest: {showLoader: boolean; ready: boolean} = {showLoader: false, ready: false};

function Probe({loading}: {loading: boolean}) {
  latest = useLoadingGate(loading);
  return <RNText>{String(latest.showLoader)}</RNText>;
}

describe('useLoadingGate', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.useRealTimers();
  });

  it('rien pendant 150 ms, puis le loader', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    expect(latest).toEqual({showLoader: false, ready: false});
    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(latest.showLoader).toBe(false);
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(latest).toEqual({showLoader: true, ready: false});
  });

  it('données rapides : jamais de loader, contenu prêt tout de suite', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    act(() => {
      renderer.update(<Probe loading={false} />);
    });
    expect(latest).toEqual({showLoader: false, ready: true});
  });

  it('une fois affiché, le loader reste au moins 450 ms', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(latest.showLoader).toBe(true);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      renderer.update(<Probe loading={false} />);
    });
    expect(latest).toEqual({showLoader: true, ready: false});
    act(() => {
      jest.advanceTimersByTime(349);
    });
    expect(latest.showLoader).toBe(true);
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(latest).toEqual({showLoader: false, ready: true});
  });
});
