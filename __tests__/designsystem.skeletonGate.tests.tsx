import React from 'react';
import {Text as RNText} from 'react-native';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {useSkeletonGate} from '@shared/designsystem/components/useSkeletonGate';

let latest: {showSkeleton: boolean; ready: boolean} = {showSkeleton: false, ready: false};

function Probe({loading}: {loading: boolean}) {
  latest = useSkeletonGate(loading);
  return <RNText>{String(latest.showSkeleton)}</RNText>;
}

describe('useSkeletonGate', () => {
  let renderer: ReactTestRenderer;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.useRealTimers();
  });

  it('rien pendant 150 ms, puis le squelette', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    expect(latest).toEqual({showSkeleton: false, ready: false});
    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(latest.showSkeleton).toBe(false);
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(latest).toEqual({showSkeleton: true, ready: false});
  });

  it('données rapides : jamais de squelette, contenu prêt tout de suite', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    act(() => {
      jest.advanceTimersByTime(50);
    });
    act(() => {
      renderer.update(<Probe loading={false} />);
    });
    expect(latest).toEqual({showSkeleton: false, ready: true});
  });

  it('une fois affiché, le squelette reste au moins 450 ms', () => {
    act(() => {
      renderer = create(<Probe loading />);
    });
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(latest.showSkeleton).toBe(true);
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      renderer.update(<Probe loading={false} />);
    });
    expect(latest).toEqual({showSkeleton: true, ready: false});
    act(() => {
      jest.advanceTimersByTime(349);
    });
    expect(latest.showSkeleton).toBe(true);
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(latest).toEqual({showSkeleton: false, ready: true});
  });
});
