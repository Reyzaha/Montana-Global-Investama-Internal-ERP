// ignore_for_file: empty_catches

import "package:basic_utils/basic_utils.dart";
import "package:flutter/material.dart";
import "package:get/get_utils/src/extensions/internacionalization.dart";
import "package:intl/intl.dart";
import "package:jiffy/jiffy.dart";

import "extensions.dart";

class Formats {
  static String spell(dynamic value) {
    if (value != null) {
      if (value is String) {
        return value;
      } else if (value is num) {
        return value.currency();
      } else if (value is bool) {
        return value ? "yes".tr : "no".tr;
      } else if (value is Jiffy) {
        return dateTime(jiffy: value);
      } else if (value is DateTime) {
        return dateAlternative(dateTime: value);
      } else {
        return value.toString();
      }
    } else {
      return "";
    }
  }

  static Jiffy? tryParseJiffy(dynamic value) {
    if (value != null) {
      if (value is String) {
        try {
          return Jiffy.parse(value);
        } catch (ex) {
          try {
            return Jiffy.parseFromDateTime(DateTime.parse(value));
          } catch (ex) {}
        }
      } else if (value is int) {
        try {
          return Jiffy.parseFromMillisecondsSinceEpoch(value);
        } catch (ex) {}
      }
    }

    return null;
  }

  static TimeOfDay? tryParseTime(String value) {
    try {
      return TimeOfDay(hour: int.parse(value.split(":")[0]), minute: int.parse(value.split(":")[1]));
    } catch (ex) {}

    return null;
  }

  static num tryParseNumber(dynamic value) {
    if (value != null) {
      if (value is String) {
        try {
          return NumberFormat("", "id").parse(value);
        } catch (ignored) {
          return num.tryParse(value) ?? 0;
        }
      } else if (value is int) {
        return value;
      } else if (value is double) {
        return value;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }

  static bool tryParseBool(dynamic value) {
    if (value != null) {
      if (value is String) {
        return bool.tryParse(value) ?? false;
      } else if (value is int) {
        return value == 1;
      } else if (value is bool) {
        return value;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  static String date({
    Jiffy? jiffy,
    String defaultString = "",
  }) {
    if (jiffy != null) {
      return jiffy.toLocal().format(pattern: "d MMM 'yy");
    } else {
      return defaultString;
    }
  }

  static String dateTime({
    Jiffy? jiffy,
    String defaultString = "",
  }) {
    if (jiffy != null) {
      return jiffy.toLocal().format(pattern: "d MMM 'yy HH:mm");
    } else {
      return defaultString;
    }
  }

  static String time({
    Jiffy? jiffy,
    String defaultString = "",
  }) {
    if (jiffy != null) {
      return jiffy.toLocal().format(pattern: "HH:mm");
    } else {
      return defaultString;
    }
  }

  static String dateAlternative({
    DateTime? dateTime,
    String defaultString = "",
  }) {
    if (dateTime != null) {
      return DateFormat("d MMM ''yy", "id").format(dateTime.toLocal());
    } else {
      return defaultString;
    }
  }

  static String dateTimeAlternative({
    DateTime? dateTime,
    String defaultString = "",
  }) {
    if (dateTime != null) {
      return DateFormat("d MMM ''yy HH:mm", "id").format(dateTime.toLocal());
    } else {
      return defaultString;
    }
  }

  static String timeAlternative({
    TimeOfDay? timeOfDay,
    String defaultString = "",
  }) {
    if (timeOfDay != null) {
      return const DefaultMaterialLocalizations().formatTimeOfDay(timeOfDay, alwaysUse24HourFormat: true);
    } else {
      return defaultString;
    }
  }

  static Map<String, dynamic> convert(Map<String, dynamic> map) {
    map.forEach((key, value) {
      if (value != null) {
        if (value is Jiffy) {
          map[key] = value.format();
        } else if (value is DateTime) {
          map[key] = Jiffy.parseFromDateTime(value).dateFormat();
        } else if (value is List) {
          for (dynamic detailValue in value) {
            if (detailValue is Jiffy) {
              detailValue = detailValue.format();
            } else if (detailValue is DateTime) {
              detailValue = Jiffy.parseFromDateTime(detailValue).dateFormat();
            } else if (detailValue is Map<String, dynamic>) {
              convert(detailValue);
            }
          }
        }
      }
    });

    return map;
  }

  static String initials(String string) {
    RegExp regex = RegExp(r"\b(\w)");

    Iterable<Match> matches = regex.allMatches(string);

    return matches.map((match) => match.group(1)).take(2).join().toUpperCase();
  }

  static String timeAgo(Jiffy jiffy) {
    Duration difference = DateTime.now().difference(jiffy.dateTime);

    if (difference.inSeconds < 60) {
      return "${difference.inSeconds}${"locale".tr == "id" ? "d" : "s"} ${"ago".tr.toLowerCase()}";
    } else if (difference.inMinutes < 60) {
      return "${difference.inMinutes}${"locale".tr == "id" ? "m" : "m"} ${"ago".tr.toLowerCase()}";
    } else if (difference.inHours < 24) {
      return "${difference.inHours}${"locale".tr == "id" ? "j" : "h"} ${"ago".tr.toLowerCase()}";
    } else if (difference.inDays < 30) {
      return "${difference.inDays}${"locale".tr == "id" ? "hr" : "d"} ${"ago".tr.toLowerCase()}";
    } else if (difference.inDays > 30 && difference.inDays < 365) {
      return "${(difference.inDays / 30).floor()}${"locale".tr == "id" ? "bln" : "mo"} ${"ago".tr.toLowerCase()}";
    } else {
      return "${(difference.inDays / 365).floor()}${"locale".tr == "id" ? "thn" : "y"} ${"ago".tr}";
    }
  }

  static String coalesce(String? value, {String? defaultString}) {
    return StringUtils.isNotNullOrEmpty(value) ? value! : defaultString ?? "n/a".tr;
  }

  static String currency(dynamic value, {String defaultString = "0"}) {
    if (value == null) {
      return defaultString;
    }

    num numberToFormat;

    if (value is num) {
      numberToFormat = value;
    } else if (value is String) {
      numberToFormat = tryParseNumber(value);
    } else {
      return defaultString;
    }

    try {
      final formatter = NumberFormat("#,##0", "id_ID");
      return formatter.format(numberToFormat);
    } catch (e) {
      return defaultString;
    }
  }

}
