import { act, render } from "@testing-library/react-native";

import SplashScreen from "../src/components/SplashScreen";

describe("SplashScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders bismillah Arabic text", () => {
    const { getByTestId } = render(<SplashScreen onComplete={() => {}} />);
    expect(getByTestId("bismillah-text")).toBeTruthy();
  });

  it("renders the Qalb app name", () => {
    const { getByTestId } = render(<SplashScreen onComplete={() => {}} />);
    expect(getByTestId("app-name")).toBeTruthy();
  });

  it("renders the gold expanding line", () => {
    const { getByTestId } = render(<SplashScreen onComplete={() => {}} />);
    expect(getByTestId("gold-line")).toBeTruthy();
  });

  it("renders three pulsing dots", () => {
    const { getByTestId } = render(<SplashScreen onComplete={() => {}} />);
    const dots = getByTestId("dots-container");
    expect(dots.props.children).toHaveLength(3);
  });

  it("calls onComplete after 2700ms (exit animation completes)", () => {
    const onComplete = jest.fn();
    render(<SplashScreen onComplete={onComplete} />);

    act(() => {
      jest.advanceTimersByTime(2200);
    });
    // exit animation runs for 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not call onComplete before exit timer fires", () => {
    const onComplete = jest.fn();
    render(<SplashScreen onComplete={onComplete} />);

    act(() => {
      jest.advanceTimersByTime(2199);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
