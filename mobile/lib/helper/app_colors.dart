// ignore_for_file: non_constant_identifier_names, constant_identifier_names


import "package:flutter/material.dart";
import "package:get/get.dart";

import "base_preferences.dart";
import "extensions.dart";

class AppColors {
  static const String THEME_MODE = "THEME_MODE";

  static Brightness brightness() {
    ThemeMode mode = themeMode();

    if (mode == ThemeMode.light) {
      return Brightness.light;
    } else if (mode == ThemeMode.dark) {
      return Brightness.dark;
    } else {
      if (Get.context != null) {
        return MediaQuery.of(Get.context!).platformBrightness;
      }

      return Brightness.light;
    }
  }

  static Brightness brightnessInverse() {
    if (darkMode()) {
      return Brightness.light;
    } else {
      return Brightness.dark;
    }
  }

  static bool darkMode() {
    return brightness() == Brightness.dark;
  }

  static ThemeMode themeMode() {
    int value = BasePreferences.getInstance().getInt(THEME_MODE) ?? 0;

    if (value == 1) {
      return ThemeMode.light;
    } else if (value == 2) {
      return ThemeMode.dark;
    } else {
      return ThemeMode.system;
    }
  }

  static Color primary() {
    if (darkMode()) {
      return darkColorScheme.primary;
    } else {
      return lightColorScheme.primary;
    }
  }

  static Color surfaceTint() {
    if (darkMode()) {
      return darkColorScheme.surfaceTint;
    } else {
      return lightColorScheme.surfaceTint;
    }
  }

  static Color onPrimary() {
    if (darkMode()) {
      return darkColorScheme.onPrimary;
    } else {
      return lightColorScheme.onPrimary;
    }
  }

  static Color primaryContainer() {
    if (darkMode()) {
      return darkColorScheme.primaryContainer;
    } else {
      return lightColorScheme.primaryContainer;
    }
  }

  static Color onPrimaryContainer() {
    if (darkMode()) {
      return darkColorScheme.onPrimaryContainer;
    } else {
      return lightColorScheme.onPrimaryContainer;
    }
  }

  static Color secondary() {
    if (darkMode()) {
      return darkColorScheme.secondary;
    } else {
      return lightColorScheme.secondary;
    }
  }

  static Color onSecondary() {
    if (darkMode()) {
      return darkColorScheme.onSecondary;
    } else {
      return lightColorScheme.onSecondary;
    }
  }

  static Color secondaryContainer() {
    if (darkMode()) {
      return darkColorScheme.secondaryContainer;
    } else {
      return lightColorScheme.secondaryContainer;
    }
  }

  static Color onSecondaryContainer() {
    if (darkMode()) {
      return darkColorScheme.onSecondaryContainer;
    } else {
      return lightColorScheme.onSecondaryContainer;
    }
  }

  static Color tertiary() {
    if (darkMode()) {
      return darkColorScheme.tertiary;
    } else {
      return lightColorScheme.tertiary;
    }
  }

  static Color onTertiary() {
    if (darkMode()) {
      return darkColorScheme.onTertiary;
    } else {
      return lightColorScheme.onTertiary;
    }
  }

  static Color tertiaryContainer() {
    if (darkMode()) {
      return darkColorScheme.tertiaryContainer;
    } else {
      return lightColorScheme.tertiaryContainer;
    }
  }

  static Color onTertiaryContainer() {
    if (darkMode()) {
      return darkColorScheme.onTertiaryContainer;
    } else {
      return lightColorScheme.onTertiaryContainer;
    }
  }

  static Color error() {
    if (darkMode()) {
      return darkColorScheme.error;
    } else {
      return lightColorScheme.error;
    }
  }

  static Color onError() {
    if (darkMode()) {
      return darkColorScheme.onError;
    } else {
      return lightColorScheme.onError;
    }
  }

  static Color errorContainer() {
    if (darkMode()) {
      return darkColorScheme.errorContainer;
    } else {
      return lightColorScheme.errorContainer;
    }
  }

  static Color onErrorContainer() {
    if (darkMode()) {
      return darkColorScheme.onErrorContainer;
    } else {
      return lightColorScheme.onErrorContainer;
    }
  }

  static Color surface() {
    if (darkMode()) {
      return darkColorScheme.surface;
    } else {
      return lightColorScheme.surface;
    }
  }

  static Color onSurface() {
    if (darkMode()) {
      return darkColorScheme.onSurface;
    } else {
      return lightColorScheme.onSurface;
    }
  }

  static Color onSurfaceVariant() {
    if (darkMode()) {
      return darkColorScheme.onSurfaceVariant;
    } else {
      return lightColorScheme.onSurfaceVariant;
    }
  }

  static Color outline() {
    if (darkMode()) {
      return darkColorScheme.outline;
    } else {
      return lightColorScheme.outline;
    }
  }

  static Color outlineVariant() {
    if (darkMode()) {
      return darkColorScheme.outlineVariant;
    } else {
      return lightColorScheme.outlineVariant;
    }
  }

  static Color shadow() {
    if (darkMode()) {
      return darkColorScheme.shadow;
    } else {
      return lightColorScheme.shadow;
    }
  }

  static Color scrim() {
    if (darkMode()) {
      return darkColorScheme.scrim;
    } else {
      return lightColorScheme.scrim;
    }
  }

  static Color inverseSurface() {
    if (darkMode()) {
      return darkColorScheme.inverseSurface;
    } else {
      return lightColorScheme.inverseSurface;
    }
  }

  static Color inversePrimary() {
    if (darkMode()) {
      return darkColorScheme.inversePrimary;
    } else {
      return lightColorScheme.inversePrimary;
    }
  }

  static Color primaryFixed() {
    if (darkMode()) {
      return darkColorScheme.primaryFixed;
    } else {
      return lightColorScheme.primaryFixed;
    }
  }

  static Color onPrimaryFixed() {
    if (darkMode()) {
      return darkColorScheme.onPrimaryFixed;
    } else {
      return lightColorScheme.onPrimaryFixed;
    }
  }

  static Color primaryFixedDim() {
    if (darkMode()) {
      return darkColorScheme.primaryFixedDim;
    } else {
      return lightColorScheme.primaryFixedDim;
    }
  }

  static Color onPrimaryFixedVariant() {
    if (darkMode()) {
      return darkColorScheme.onPrimaryFixedVariant;
    } else {
      return lightColorScheme.onPrimaryFixedVariant;
    }
  }

  static Color secondaryFixed() {
    if (darkMode()) {
      return darkColorScheme.secondaryFixed;
    } else {
      return lightColorScheme.secondaryFixed;
    }
  }

  static Color onSecondaryFixed() {
    if (darkMode()) {
      return darkColorScheme.onSecondaryFixed;
    } else {
      return lightColorScheme.onSecondaryFixed;
    }
  }

  static Color secondaryFixedDim() {
    if (darkMode()) {
      return darkColorScheme.secondaryFixedDim;
    } else {
      return lightColorScheme.secondaryFixedDim;
    }
  }

  static Color onSecondaryFixedVariant() {
    if (darkMode()) {
      return darkColorScheme.onSecondaryFixedVariant;
    } else {
      return lightColorScheme.onSecondaryFixedVariant;
    }
  }

  static Color tertiaryFixed() {
    if (darkMode()) {
      return darkColorScheme.tertiaryFixed;
    } else {
      return lightColorScheme.tertiaryFixed;
    }
  }

  static Color onTertiaryFixed() {
    if (darkMode()) {
      return darkColorScheme.onTertiaryFixed;
    } else {
      return lightColorScheme.onTertiaryFixed;
    }
  }

  static Color tertiaryFixedDim() {
    if (darkMode()) {
      return darkColorScheme.tertiaryFixedDim;
    } else {
      return lightColorScheme.tertiaryFixedDim;
    }
  }

  static Color onTertiaryFixedVariant() {
    if (darkMode()) {
      return darkColorScheme.onTertiaryFixedVariant;
    } else {
      return lightColorScheme.onTertiaryFixedVariant;
    }
  }

  static Color surfaceDim() {
    if (darkMode()) {
      return darkColorScheme.surfaceDim;
    } else {
      return lightColorScheme.surfaceDim;
    }
  }

  static Color surfaceBright() {
    if (darkMode()) {
      return darkColorScheme.surfaceBright;
    } else {
      return lightColorScheme.surfaceBright;
    }
  }

  static Color surfaceContainerLowest() {
    if (darkMode()) {
      return darkColorScheme.surfaceContainerLowest;
    } else {
      return lightColorScheme.surfaceContainerLowest;
    }
  }

  static Color surfaceContainerLow() {
    if (darkMode()) {
      return darkColorScheme.surfaceContainerLow;
    } else {
      return lightColorScheme.surfaceContainerLow;
    }
  }

  static Color surfaceContainer() {
    if (darkMode()) {
      return darkColorScheme.surfaceContainer;
    } else {
      return lightColorScheme.surfaceContainer;
    }
  }

  static Color surfaceContainerHigh() {
    if (darkMode()) {
      return darkColorScheme.surfaceContainerHigh;
    } else {
      return lightColorScheme.surfaceContainerHigh;
    }
  }

  static Color surfaceContainerHighest() {
    if (darkMode()) {
      return darkColorScheme.surfaceContainerHighest;
    } else {
      return lightColorScheme.surfaceContainerHighest;
    }
  }

  static Color success() {
    if (darkMode()) {
      return Colors.green.shade100;
    } else {
      return Colors.green.shade700;
    }
  }

  static Color onSuccess() {
    if (darkMode()) {
      return Colors.green.shade900;
    } else {
      return Colors.white;
    }
  }

  static Color successContainer() {
    if (darkMode()) {
      return Colors.green.shade700;
    } else {
      return Colors.green.shade100;
    }
  }

  static Color onSuccessContainer() {
    if (darkMode()) {
      return Colors.white;
    } else {
      return Colors.green.shade900;
    }
  }

  static Color warning() {
    if (darkMode()) {
      return Colors.orange.shade100;
    } else {
      return Colors.orange.shade700;
    }
  }

  static Color onWarning() {
    if (darkMode()) {
      return Colors.orange.shade900;
    } else {
      return Colors.orange.shade100;
    }
  }

  static Color warningContainer() {
    if (darkMode()) {
      return Colors.orange.shade700;
    } else {
      return Colors.orange.shade100;
    }
  }

  static Color onWarningContainer() {
    if (darkMode()) {
      return Colors.orange.shade100;
    } else {
      return Colors.orange.shade900;
    }
  }

  static Color backgroundSurface() {
    if (darkMode()) {
      return darkColorScheme.surface.darken(50);
    } else {
      return lightColorScheme.surface.darken(5);
    }
  }

  static Color material(MaterialColor materialColor) {
    if (darkMode()) {
      return materialColor.shade100;
    } else {
      return materialColor.shade700;
    }
  }

  static Color onMaterial(MaterialColor materialColor) {
    if (darkMode()) {
      return materialColor.shade900;
    } else {
      return materialColor.shade50;
    }
  }

  static Color materialContainer(MaterialColor materialColor) {
    if (darkMode()) {
      return materialColor.shade700;
    } else {
      return materialColor.shade100;
    }
  }

  static Color onMaterialContainer(MaterialColor materialColor) {
    if (darkMode()) {
      return materialColor.shade50;
    } else {
      return materialColor.shade900;
    }
  }

  static ColorScheme lightColorScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF1E3A8A),
    primary: const Color(0xFF1E3A8A),
    secondary: const Color(0xFF0D9488),
    brightness: Brightness.light,
  );
  static ColorScheme darkColorScheme = ColorScheme.fromSeed(
    seedColor: const Color(0xFF1E3A8A),
    primary: const Color(0xFF3B82F6),
    secondary: const Color(0xFF14B8A6),
    brightness: Brightness.dark,
  );
}
