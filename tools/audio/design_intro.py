"""Design the first original GAMESHUB Engine logo sound.

The source is synthesized here with transient noise, inharmonic metal-body
resonance, a low impact and a synthetic acoustic impulse response. No audio
model, third-party recording or canned oscillator-only alert is used.

Run: python tools/audio/design_intro.py INTRO.wav [TEST_CUE.wav]
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt


RATE = 48_000
LENGTH = 4.82
FRAMES = int(RATE * LENGTH)
RNG = np.random.default_rng(20483)


def noise(length: int) -> np.ndarray:
    return RNG.standard_normal(length).astype(np.float64)


def band_noise(length: int, low: float, high: float) -> np.ndarray:
    sos = butter(3, [low, high], btype="bandpass", fs=RATE, output="sos")
    result = sosfilt(sos, noise(length))
    return result / max(np.std(result) * 3.5, 1e-7)


def low_noise(length: int, cutoff: float) -> np.ndarray:
    sos = butter(3, cutoff, btype="lowpass", fs=RATE, output="sos")
    result = sosfilt(sos, noise(length))
    return result / max(np.std(result) * 3.5, 1e-7)


def add(stereo: np.ndarray, start: float, sound: np.ndarray, pan: float = 0.0) -> None:
    offset = int(start * RATE)
    n = min(sound.size, stereo.shape[1] - offset)
    if n <= 0:
        return
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    stereo[0, offset : offset + n] += sound[:n] * left
    stereo[1, offset : offset + n] += sound[:n] * right


def metal_body(duration: float, brightness: float = 1.0, scale: float = 1.0) -> np.ndarray:
    """A struck metal surface with multiple *inharmonic* decaying modes."""
    n = int(duration * RATE)
    time = np.arange(n) / RATE
    freqs = [263, 383, 617, 1049, 1711, 2693, 3769]
    modal = np.zeros(n, dtype=np.float64)
    for i, f in enumerate(freqs):
        frequency = f * scale * (1 + (i * 0.00091))
        tau = (0.67 if i == 0 else 0.32 / (1 + i * 0.32)) * (0.7 + brightness * 0.3)
        partial = np.sin(2 * np.pi * frequency * time + i * 2.23)
        partial *= np.exp(-time / tau) / (i + 1) ** 0.64
        modal += partial
    modal *= 0.19
    surface = band_noise(n, 900, 11000)
    scrape = band_noise(n, 170, 3400)
    attack = surface * np.exp(-time / 0.011) * 0.33 * brightness
    ring = surface * np.exp(-time / 0.145) * 0.08
    texture = scrape * np.exp(-time / 0.063) * 0.11
    return np.tanh(modal + attack + ring + texture)


def save_audio(stereo: np.ndarray, destination: Path) -> None:
    stereo -= np.mean(stereo, axis=1)[:, None]
    stereo *= 0.90 / max(np.max(np.abs(stereo)), 1e-8)
    pcm = np.int16(np.round(stereo.T * 32767))
    destination.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(destination, RATE, pcm)


def create_test_cue(destination: Path) -> None:
    """A short, distinct metallic latch for the test lab's audio button."""
    stereo = np.zeros((2, int(RATE * 1.65)), dtype=np.float64)
    add(stereo, 0.03, metal_body(0.43, brightness=0.77, scale=1.68) * 0.55, -0.28)
    add(stereo, 0.27, metal_body(0.84, brightness=0.92, scale=1.23) * 0.52, 0.2)
    n = int(0.36 * RATE)
    t = np.arange(n) / RATE
    add(stereo, 0.25, low_noise(n, 240) * np.exp(-t / 0.12) * 0.16, 0)
    for ch in range(2):
        delay = int(RATE * (0.105 + ch * 0.014))
        length = int(RATE * 0.8)
        reflected = np.zeros(stereo.shape[1])
        reflected[delay:delay + length] = stereo[ch, :length] * 0.12
        stereo[ch] += reflected
    time = np.arange(stereo.shape[1]) / RATE
    stereo *= np.clip((1.54 - time) / 0.28, 0, 1)
    save_audio(stereo, destination)
    print(f"Wrote {destination}: 1.65s stereo original test cue")


def main() -> None:
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: python tools/audio/design_intro.py INTRO.wav [TEST_CUE.wav]")
    stereo = np.zeros((2, FRAMES), dtype=np.float64)

    # A low airy approach, following the approaching light beams.
    n = int(1.48 * RATE)
    t = np.arange(n) / RATE
    soft = band_noise(n, 110, 970)
    air = band_noise(n, 1350, 6500)
    rise = np.clip((t - 0.03) / 1.27, 0, 1) ** 1.8
    tail = np.clip((1.48 - t) / 0.18, 0, 1)
    whoosh = (soft * 0.36 + air * 0.18) * rise * tail
    for i in range(n):
        p = -0.60 + 1.20 * t[i] / 1.48
        stereo[0, i] += whoosh[i] * np.cos((p + 1) * np.pi / 4)
        stereo[1, i] += whoosh[i] * np.sin((p + 1) * np.pi / 4)

    # Three mechanics locking into place as the emblem forms.
    for at, pan, scale, gain in [(0.59, -0.47, 1.4, 0.26),
                                 (0.93, 0.38, 1.17, 0.30),
                                 (1.17, -0.13, 0.91, 0.32)]:
        add(stereo, at, metal_body(0.45, brightness=0.95, scale=scale) * gain, pan)

    # Final mechanical strike at the logo's CSS impact frame (~1.38 seconds).
    add(stereo, 1.43, metal_body(1.96, brightness=1.22, scale=0.78) * 0.66, 0)
    add(stereo, 1.435, metal_body(1.2, brightness=1.07, scale=1.42) * 0.20, 0.23)

    # Weight under the impact: decaying sub-bass *plus* non-tonal pressure/noise.
    n = int(1.8 * RATE)
    t = np.arange(n) / RATE
    frequency = 69 * np.exp(-t / 0.17) + 34
    phase = 2 * np.pi * np.cumsum(frequency) / RATE
    pressure = np.sin(phase) * np.exp(-t / 0.47)
    rumble = low_noise(n, 165) * np.exp(-t / 0.36)
    thump = (pressure * 0.23 + rumble * 0.37) * np.clip(t / 0.007, 0, 1)
    add(stereo, 1.42, thump, 0)

    # As the title resolves, a very short airy glint (no melody or beeps).
    n = int(0.74 * RATE)
    t = np.arange(n) / RATE
    glint = band_noise(n, 3900, 13500) * np.exp(-t / 0.19) * 0.16
    add(stereo, 1.93, glint, 0.28)

    # Custom diffused acoustic tail with independent stereo reflections.
    dry = stereo.copy()
    for ch in range(2):
        n = int(0.84 * RATE)
        t = np.arange(n) / RATE
        ir = low_noise(n, 5900) * np.exp(-t / 0.32) * 0.021
        ir[0] = 0.58
        for offset, level in [(0.064 + 0.009 * ch, 0.21),
                              (0.117 + 0.007 * ch, -0.17),
                              (0.204 + 0.014 * ch, 0.11),
                              (0.314 + 0.021 * ch, -0.08)]:
            ir[int(offset * RATE)] += level
        wet = fftconvolve(dry[ch], ir, mode="full")[:FRAMES]
        stereo[ch] = dry[ch] * 0.8 + wet * 0.31

    # Keep a quiet beat after the last sound as the finished logo holds.
    time = np.arange(FRAMES) / RATE
    fade = np.minimum(1.0, np.maximum(0.0, (4.18 - time) / 0.62))
    stereo *= fade
    destination = Path(sys.argv[1])
    save_audio(stereo, destination)
    print(f"Wrote {destination}: {LENGTH:.2f}s stereo 48kHz original designed audio")
    if len(sys.argv) == 3:
        create_test_cue(Path(sys.argv[2]))


if __name__ == "__main__":
    main()
