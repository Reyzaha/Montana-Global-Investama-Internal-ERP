/*
import "dart:ui";

import "package:firebase_messaging/firebase_messaging.dart";
import "package:flutter/foundation.dart";
import "package:intl/date_symbol_data_local.dart";
import "package:jiffy/jiffy.dart";

import "base_preferences.dart";
import "notifications.dart";

bool isInBackground = false;
bool isMounted = false;

@pragma("vm:entry-point")
Future<void> firebaseCloudMessagingBackgroundHandler(RemoteMessage remoteMessage) async {
  isInBackground = true;

  await FirebaseCloudMessagings.receive(remoteMessage);
}

class FirebaseCloudMessagings {
  static Future<void> initialize() async {
    FirebaseMessaging.onBackgroundMessage(
      firebaseCloudMessagingBackgroundHandler,
    );

    FirebaseMessaging.onMessage.listen((RemoteMessage remoteMessage) async {
      await receive(remoteMessage);
    });

    await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    String? token = await FirebaseMessaging.instance.getToken();

    if (kDebugMode) {
      print("Firebase cloud messaging token : $token");
    }
  }

  static Future<void> initializePlugins() async {
    if (!isMounted) {
      DartPluginRegistrant.ensureInitialized();

      await BasePreferences.getInstance().init();
      await Notifications.getInstance().initialize();

      initializeDateFormatting();

      await Jiffy.setLocale("id");

      isMounted = true;
    }
  }

  static Future<void> receive(RemoteMessage remoteMessage) async {
    if (kDebugMode) {
      print("[VireoPOS] isInBackground -> $isInBackground, isMounted -> $isMounted");
    }

    if (isInBackground) {
      await initializePlugins();
    }

    if (remoteMessage.data.containsKey("notification.title")) {
      await Notifications.getInstance().showNotification(
        title: remoteMessage.data["notification.title"],
        body: remoteMessage.data["notification.body"],
        payload: remoteMessage.data["notification.payload"],
      );
    }

    if (remoteMessage.data.containsKey("type")) {
      String _ = remoteMessage.data["type"] ?? "";
    }
  }
}*/
