export interface CalibrationSample {
    /** Raw (uncalibrated) confidence in 0.000–1.000. */
    confidence: number;
    /** Ground truth: was the claim correct? */
    correct: boolean;
}
export interface CalibrationParams {
    /** Slope applied in logit space. */
    a: number;
    /** Intercept applied in logit space. */
    b: number;
    version: string;
    fittedAt?: number;
    samples?: number;
}
export declare const IDENTITY_CALIBRATION: CalibrationParams;
export declare function getCalibration(): CalibrationParams;
export declare function setCalibration(params: CalibrationParams | undefined): void;
/** Read calibration.json; a missing or broken file keeps the identity map. */
export declare function loadCalibrationFile(file: string): CalibrationParams | undefined;
/** Apply the current (or given) calibration to a raw confidence. */
export declare function applyCalibration(confidence: number, params?: CalibrationParams): number;
/**
 * Fit Platt scaling by gradient descent on log loss.
 *
 *   p' = sigmoid(a * logit(p) + b)
 *
 * Returns the fitted parameters; callers decide whether to persist them.
 */
export declare function fitPlatt(samples: CalibrationSample[], options?: {
    iterations?: number;
    learningRate?: number;
}): CalibrationParams;
export declare function brierScore(samples: CalibrationSample[], params?: CalibrationParams): number;
/** Expected calibration error over equal-width confidence bins. */
export declare function expectedCalibrationError(samples: CalibrationSample[], params?: CalibrationParams, bins?: number): number;
export declare function reliabilityCurve(samples: CalibrationSample[], params?: CalibrationParams, bins?: number): Array<{
    bucket: string;
    count: number;
    avgConfidence: number;
    accuracy: number;
}>;
