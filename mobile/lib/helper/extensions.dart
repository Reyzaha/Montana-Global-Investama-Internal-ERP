// ignore_for_file: deprecated_member_use

import "package:flutter/material.dart";
import "package:intl/intl.dart";
import "package:jiffy/jiffy.dart";

extension TimeOfDayExtension on TimeOfDay {
  int compareTo(TimeOfDay other) {
    if (hour < other.hour) {
      return -1;
    }

    if (hour > other.hour) {
      return 1;
    }

    if (minute < other.minute) {
      return -1;
    }

    if (minute > other.minute) {
      return 1;
    }

    return 0;
  }

  String timeFormat() {
    return const DefaultMaterialLocalizations().formatTimeOfDay(this, alwaysUse24HourFormat: true);
  }
}

extension ColorExtension on Color {
  Color darken([int percent = 10]) {
    assert(1 <= percent && percent <= 100);

    var f = 1 - percent / 100;

    return Color.fromARGB(
        alpha,
        (red * f).round(),
        (green  * f).round(),
        (blue * f).round(),
    );
  }

  Color lighten([int percent = 10]) {
    assert(1 <= percent && percent <= 100);
    var p = percent / 100;
    return Color.fromARGB(
        alpha,
        red + ((255 - red) * p).round(),
        green + ((255 - green) * p).round(),
        blue + ((255 - blue) * p).round(),
    );
  }
}

extension Unique<E, Id> on List<E> {
  List<E> unique([Id Function(E element)? id, bool inplace = true]) {
    final ids = <dynamic>{};
    var list = inplace ? this : List<E>.from(this)
    ..retainWhere((x) => ids.add(id != null ? id(x) : x as Id));
    return list;
  }
}

extension JiffyExtension on Jiffy {
  static Jiffy min = Jiffy.parseFromDateTime(DateTime(1900, 1, 1));
  static Jiffy max = Jiffy.parseFromDateTime(DateTime(2099, 12, 31));

  String dateFormat() {
    return format(pattern: "yyyy-MM-dd");
  }

  String dateTimeFormat() {
    return format(pattern: "yyyy-MM-dd HH:mm");
  }
}

extension NumberExtension on num {
  String currency() {
    NumberFormat numberFormat = NumberFormat("#,###.##", "id");

    return numberFormat.format(this);
  }
}

extension CurrencyString on String {
  String currencyString() {
    double amount = double.parse(this);
    NumberFormat currencyFormatter = NumberFormat("#,###.##", "id" );
    return currencyFormatter.format(amount);
  }
}
extension BoolParsing on String {
  bool parseBool() {
    return toLowerCase() == "true";
  }
}

extension MapExtension<K, V> on Map<K, V> {
  Map<K, V> append(Map<K, V> map) {
    addAll(map);

    return this;
  }
}
