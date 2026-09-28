/*
// ignore_for_file: always_specify_types, always_declare_return_types, avoid_print

import "package:flutter_local_notifications/flutter_local_notifications.dart";

import "firebase_cloud_messagings.dart";

Future<void> notificationTapped(NotificationResponse details) async {

}

class Notifications {
  static Notifications? _instance;

  Notifications._internal();

  static Notifications getInstance() {
    _instance ??= Notifications._internal();

    return _instance!;
  }

  late FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin;

  initialize() async {
    flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin()
      ..initialize(
        const InitializationSettings(
          android: AndroidInitializationSettings("@mipmap/ic_launcher"),
          iOS: DarwinInitializationSettings(),
          macOS: DarwinInitializationSettings(),
          windows: WindowsInitializationSettings(appName: "Vireo Pos", appUserModelId: "com.sisapp.vireo", guid: "26b06c0c-2bc4-4191-96ca-b659aa32bd6f"),
        ),
        onDidReceiveNotificationResponse: notificationTapped,
        onDidReceiveBackgroundNotificationResponse: notificationTapped,
      )
      ..resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.createNotificationChannel(
        const AndroidNotificationChannel(
          "General",
          "General",
          description: "General Notifications",
          importance: Importance.max,
        ),
      );

    if (!isInBackground) {
      flutterLocalNotificationsPlugin
        ..resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        )
        ..resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()?.requestNotificationsPermission();
    }
  }

  Future<void> showNotification({
    String channelName = "General",
    String channelDescription = "General",
    String? title,
    String? body,
    String? payload,
  }) async {
    NotificationDetails platformChannelSpecifics = NotificationDetails(
      android: AndroidNotificationDetails(
        channelName,
        channelName,
        channelDescription: channelDescription,
        importance: Importance.max,
        playSound: true,
        priority: Priority.high,
        styleInformation: BigTextStyleInformation(
          body ?? "",
          htmlFormatTitle: true,
          htmlFormatSummaryText: true,
          htmlFormatContentTitle: true,
          htmlFormatBigText: true,
          htmlFormatContent: true,
        ),
      ),
      iOS: const DarwinNotificationDetails(),
    );

    await flutterLocalNotificationsPlugin.show(
      0,
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }


}*/
