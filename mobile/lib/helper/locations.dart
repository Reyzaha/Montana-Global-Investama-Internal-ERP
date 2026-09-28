/*
// ignore_for_file: always_specify_types, deprecated_member_use

import "package:geocoding/geocoding.dart";
import "package:geolocator/geolocator.dart";

class Locations {
  static Future<LongLat?> lastPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();

    if (!serviceEnabled) {
      throw Exception("GPS dalam keadaan mati");
    }

    LocationPermission locationPermission = await Geolocator.checkPermission();

    if (locationPermission == LocationPermission.denied || locationPermission == LocationPermission.deniedForever) {
      locationPermission = await Geolocator.requestPermission();

      if (locationPermission == LocationPermission.denied || locationPermission == LocationPermission.deniedForever) {
        throw Exception("Izin lokasi ditolak. Mohon untuk mengizinkan aplikasi untuk mengakses lokasi anda");
      }
    }

    Position? position;

    try {
      position = await Geolocator.getCurrentPosition(
        timeLimit: const Duration(seconds: 5),
      );
    } catch (e) {
      position = await Geolocator.getLastKnownPosition();
    }

    if (position!.isMocked) {
      throw Exception("Aplikasi mendeteksi bahwa fake gps perangkat anda aktif, mohon untuk menonaktifkannya dahulu atau jika pesan ini keliru, mohon untuk mencoba kembali");
    }

    return LongLat(
      latitude: position.latitude,
      longitude: position.longitude,
    );
  }

  static double distanceBetween(double a, double b, double c, double d) {
    return Geolocator.distanceBetween(a, b, c, d);
  }

  static Future<String?> lastPlacemarkPosition() async {
    try {
      LongLat? longLat = await Locations.lastPosition();

      if (longLat != null) {
        List<Placemark> placemarks = await placemarkFromCoordinates(longLat.latitude, longLat.longitude);

        if (placemarks.isNotEmpty) {
          Placemark placemark = placemarks[0];

          return "(lat:${longLat.latitude}. long:${longLat.longitude}) ${placemark.street}, ${placemark.subLocality}, ${placemark.locality}, ${placemark.subAdministrativeArea}, ${placemark.administrativeArea} ${placemark.postalCode}, ${placemark.country}";
        }
      }
    } catch (ex) {
      print(ex);
    }

    return null;
  }
}

class LongLat {
  final double latitude;
  final double longitude;

  LongLat({required this.latitude, required this.longitude});
}
*/
