#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import serial
import serial.tools.list_ports
import struct
import time
import threading
import re
import json
from dataclasses import dataclass, asdict, field
from typing import Optional, List
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
import queue
from flask import Flask, send_from_directory
import os
import pyfiglet


@dataclass
class TelemetryData:
    """Telemetri verilerini tutan sınıf"""
    altitude: float = 0.0
    max_altitude: float = 0.0
    gps_altitude: float = 0.0
    delta_y: float = 0.0
    fired: bool = False  # Eski format için geriye uyumluluk
    p1: bool = False  # Birincil paraşüt durumu (0=kapalı, 1=açık)
    p2: bool = False  # İkincil paraşüt durumu (0=kapalı, 1=açık)
    gyro_x: float = 0.0
    gyro_y: float = 0.0
    gyro_z: float = 0.0
    accel_x: float = 0.00
    accel_y: float = 0.00
    accel_z: float = 0.00
    pitch: float = 0.0
    gps_latitude: float = 0.0
    gps_longitude: float = 0.0
    gps_valid: bool = False
    payload_gps_altitude: float = 0.0
    payload_latitude: float = 0.0
    payload_longitude: float = 0.0
    payload_gps_valid: bool = True
    payload_gyro_x: float = 0.0
    payload_gyro_y: float = 0.0
    payload_gyro_z: float = 0.0
    last_update: str = ""
    packet_count: int = 0
    payload_last_update: str = ""
    payload_packet_count: int = 0
    all_liquid_data: str = ""  # 192-bit binary string
    liquid_levels: List[int] = field(default_factory=lambda: [0] * 24)

class TEKNOFESTGroundStation:
    """TEKNOFEST Yer İstasyonu Ana Sınıfı"""
    
    def __init__(self):
        self.lora_connection: Optional[serial.Serial] = None
        self.payload_gps_connection: Optional[serial.Serial] = None
        self.hyi_connection: Optional[serial.Serial] = None

        self.running = False
        self.telemetry = TelemetryData()
        self.packet_counter = 0
        self.team_id = 68
        self.auto_send = True
        self.last_hyi_send = 0
        
        # Log queue
        self.log_queue = queue.Queue(maxsize=100)
        
    def add_log(self, message):
        """Log mesajı ekle"""
        try:
            timestamp = datetime.now().strftime('%H:%M:%S')
            log_entry = f"[{timestamp}] {message}"
            self.log_queue.put(log_entry, block=False)
            print(log_entry)
        except queue.Full:
            # Eski logları temizle
            try:
                for _ in range(10):
                    self.log_queue.get_nowait()
                self.log_queue.put(f"[{timestamp}] {message}", block=False)
            except queue.Empty:
                pass
    
    def get_logs(self):
        """Son log mesajlarını al"""
        logs = []
        try:
            while not self.log_queue.empty():
                logs.append(self.log_queue.get_nowait())
        except queue.Empty:
            pass
        return logs
    
    @staticmethod
    def get_available_ports() -> List[dict]:
        """Mevcut COM portlarını listele"""
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                'port': port.device,
                'description': port.description,
                'hwid': port.hwid
            })
        return ports
    
    def connect_lora(self, port: str, baudrate: int = 9600) -> bool:
        """LoRa modülüne bağlan"""
        try:
            if self.lora_connection and self.lora_connection.is_open:
                self.lora_connection.close()
            
            self.lora_connection = serial.Serial(port, baudrate, timeout=1)
            self.add_log(f"✅ LoRa bağlandı: {port} ({baudrate} baud)")
            return True
        except Exception as e:
            self.add_log(f"❌ LoRa bağlantı hatası: {e}")
            return False
    
    def connect_payload_gps(self, port: str, baudrate: int = 9600) -> bool:
        """Payload GPS modülüne bağlan"""
        try:
            if self.payload_gps_connection and self.payload_gps_connection.is_open:
                self.payload_gps_connection.close()
            
            self.payload_gps_connection = serial.Serial(port, baudrate, timeout=1)
            
            # Port ayarlarını kontrol et
            self.add_log(f"✅ Payload GPS bağlandı: {port} ({baudrate} baud)")
            self.add_log(f"🛰️ Port ayarları: {self.payload_gps_connection.get_settings()}")
            
            # Test veri gönder (eğer port yazılabilirse)
            try:
                if self.payload_gps_connection.writable():
                    self.add_log("🛰️ Port yazılabilir durumda")
                else:
                    self.add_log("⚠️ Port yazılamıyor")
            except:
                self.add_log("⚠️ Port yazma durumu kontrol edilemedi")
            
            return True
        except Exception as e:
            self.add_log(f"❌ Payload GPS bağlantı hatası: {e}")
            return False
    
    def connect_hyi(self, port: str) -> bool:
        """HYİ cihazına bağlan"""
        try:
            if self.hyi_connection and self.hyi_connection.is_open:
                self.hyi_connection.close()
                
            self.hyi_connection = serial.Serial(
                port=port,
                baudrate=19200,
                bytesize=8,
                parity=serial.PARITY_NONE,
                stopbits=1,
                timeout=1
            )
            self.add_log(f"✅ HYİ bağlandı: {port} (19200 baud)")
            return True
        except Exception as e:
            self.add_log(f"❌ HYİ bağlantı hatası: {e}")
            return False
    

    
    def parse_lora_data(self, data_str: str) -> bool:
        """LoRa'dan gelen roket verilerini parse et"""
        try:
            # ALT:837.9m|maxALT:838.6m|dY:1.9|F:0|gX:-1.9|gY:-4.2|gZ:0.0|GPS:invalid
            # veya GPS:39.925019,32.836954
            
            self.add_log(f"📡 Raw LoRa: {data_str}")
            
            # İrtifa (ALT)
            alt_match = re.search(r'ALT:([\d.-]+)m', data_str)
            if alt_match:
                self.telemetry.altitude = float(alt_match.group(1))
            
            # Maksimum İrtifa (maxALT)
            max_alt_match = re.search(r'maxALT:([\d.-]+)m', data_str)
            if max_alt_match:
                self.telemetry.max_altitude = float(max_alt_match.group(1))
            
            # Delta Y (dY)
            dy_match = re.search(r'dY:([\d.-]+)', data_str)
            if dy_match:
                self.telemetry.delta_y = float(dy_match.group(1))
            
            # Fired (F) - Eski format için geriye uyumluluk
            f_match = re.search(r'F:([01])', data_str)
            if f_match:
                self.telemetry.fired = f_match.group(1) == '1'
            
            # P1 (Birincil Paraşüt)
            p1_match = re.search(r'P1:([01])', data_str)
            if p1_match:
                self.telemetry.p1 = p1_match.group(1) == '1'
            
            # P2 (İkincil Paraşüt)
            p2_match = re.search(r'P2:([01])', data_str)
            if p2_match:
                self.telemetry.p2 = p2_match.group(1) == '1'
            
            # Gyro X (gX)
            gx_match = re.search(r'gX:([\d.-]+)', data_str)
            if gx_match:
                self.telemetry.gyro_x = float(gx_match.group(1))
            
            # Gyro Y (gY)
            gy_match = re.search(r'gY:([\d.-]+)', data_str)
            if gy_match:
                self.telemetry.gyro_y = float(gy_match.group(1))
            
            # Gyro Z (gZ)
            gz_match = re.search(r'gZ:([\d.-]+)', data_str)
            if gz_match:
                self.telemetry.gyro_z = float(gz_match.group(1))
            
            # Accel X (aX)
            ax_match = re.search(r'aX:([\d.-]+)', data_str)
            if ax_match:
                self.telemetry.accel_x = float(ax_match.group(1))
            
            # Accel Y (aY)
            ay_match = re.search(r'aY:([\d.-]+)', data_str)
            if ay_match:
                self.telemetry.accel_y = float(ay_match.group(1))

            # Accel Z (aZ)
            az_match = re.search(r'aZ:([\d.-]+)', data_str)
            if az_match:
                self.telemetry.accel_z = float(az_match.group(1))

            # Pitch (P)
            pitch_match = re.search(r'pitch:([\d.-]+)', data_str)
            if pitch_match:
                self.telemetry.pitch = float(pitch_match.group(1))
            
            # Roket GPS kontrolü
            if 'GPS:invalid' in data_str:
                self.telemetry.gps_valid = False
                self.telemetry.gps_altitude = 0.0
                self.telemetry.gps_latitude = 0.0
                self.telemetry.gps_longitude = 0.0
            else:
                gps_match = re.search(r'GPS:([\d.-]+),([\d.-]+)', data_str)
                if gps_match:
                    self.telemetry.gps_latitude = float(gps_match.group(1))
                    self.telemetry.gps_longitude = float(gps_match.group(2))
                    self.telemetry.gps_valid = True
                    # GPS irtifa ayrı bir değişken olarak alınabilir
                    alt_gps_match = re.search(r'GPS_ALT:([\d.-]+)', data_str)
                    if alt_gps_match:
                        self.telemetry.gps_altitude = float(alt_gps_match.group(1))
            
            self.telemetry.last_update = datetime.now().strftime("%H:%M:%S")
            self.telemetry.packet_count += 1
            
            gps_status = f"{self.telemetry.gps_latitude:.6f},{self.telemetry.gps_longitude:.6f}" if self.telemetry.gps_valid else "INVALID"
            parachute_status = f"P1={'AÇIK' if self.telemetry.p1 else 'KAPALI'}, P2={'AÇIK' if self.telemetry.p2 else 'KAPALI'}"
            self.add_log(f"📊 Roket Telemetri: Alt={self.telemetry.altitude:.1f}m, GPS={gps_status}, Paraşüt={parachute_status}")
            
            return True
            
        except Exception as e:
            self.add_log(f"❌ LoRa Parse hatası: {e} - Data: {data_str}")
            return False
    
    def parse_all_liquid_data(self, data_str: str) -> bool:
        """ALL sıvı seviye verisini parse et"""
        try:
            # Yeni format: ALL=000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
            # Eski format: ALL:1010101010101010... formatında gelen veri (192-bit)
            
            binary_data = None
            format_type = None
            
            # Yeni format kontrolü
            all_new_match = re.search(r'ALL=([01]{192})', data_str)
            if all_new_match:
                binary_data = all_new_match.group(1)
                format_type = "yeni"
            
            # Eski format kontrolü
            if not binary_data:
                all_old_match = re.search(r'ALL:([01]{192})', data_str)
                if all_old_match:
                    binary_data = all_old_match.group(1)
                    format_type = "eski"
            
            if binary_data:
                # Veriyi kontrol et - eğer tümü 0 ise bir önceki veriyi koru
                if binary_data == '0' * 192:
                    self.add_log(f"⚠️ Sıvı seviye verisi full 0 - önceki veri korunuyor")
                    return True  # Önceki veriyi koruyarak başarılı dön
                
                # 192-bit'i 24 adet 8-bit'e böl
                levels = []
                for i in range(24):
                    start_bit = i * 8
                    end_bit = start_bit + 8
                    byte_str = binary_data[start_bit:end_bit]
                    level = int(byte_str, 2)  # Binary to decimal
                    levels.append(level)
                
                # Tüm level değerleri 0 ise (yine de kontrol et)
                if all(level == 0 for level in levels):
                    self.add_log(f"⚠️ Tüm sensör seviyeleri 0 - önceki veri korunuyor")
                    return True  # Önceki veriyi koruyarak başarılı dön
                
                # Geçerli veri var, güncelle
                self.telemetry.all_liquid_data = binary_data
                self.telemetry.liquid_levels = levels
                
                # Log'da ilk birkaç sensörün değerini göster
                sample_levels = levels[:5] if len(levels) >= 5 else levels
                self.add_log(f"🌊 Sıvı seviye verisi ({format_type} format): {len(levels)} sensör, Örnek: {sample_levels}, Raw: {binary_data[:20]}...")
                return True
                
        except Exception as e:
            self.add_log(f"❌ ALL parse hatası: {e}")
            return False
        
        # Veri bulunamadı veya geçersiz format
        if 'NA' in data_str or 'na' in data_str.lower():
            self.add_log(f"⚠️ Sıvı seviye verisi NA - önceki veri korunuyor")
            return True  # Önceki veriyi koruyarak başarılı dön
        
        return False

    def parse_payload_gps_data(self, data_str: str) -> bool:
        """Payload GPS'den gelen veriyi parse et"""
        try:
            # Payload GPS format örnekleri:
            # "PAYLOAD_GPS nofix lat=11.111110, lon=22.222219, alt=0.0 m" (yeni format)
            # "PAYLOAD_GPS:39.925019,32.836954,850.5" (eski format)
            # "$GPGGA,123519,4807.038,N,01131.324,E,1,08,0.9,545.4,M,46.9,M,,*42"
            # "PL_ALT:850.5|PL_LAT:39.925019|PL_LON:32.836954"
            
            self.add_log(f"🛰️ Parsing Payload GPS: {data_str}")
            
            # Format 1: PAYLOAD_GPS nofix lat=11.111110, lon=22.222219, alt=0.0 m (etiketli format)
            payload_nofix_match = re.search(r'PAYLOAD_GPS nofix lat=([\d.-]+), lon=([\d.-]+), alt=([\d.-]+) m', data_str)
            if payload_nofix_match:
                self.telemetry.payload_latitude = float(payload_nofix_match.group(1))
                self.telemetry.payload_longitude = float(payload_nofix_match.group(2))
                self.telemetry.payload_gps_altitude = float(payload_nofix_match.group(3))
                self.telemetry.payload_gps_valid = False  # nofix = invalid
                self.add_log(f"🛰️ Format nofix matched: lat={self.telemetry.payload_latitude}, lon={self.telemetry.payload_longitude}, alt={self.telemetry.payload_gps_altitude} (NOFIX)")

            # Format 1b: PAYLOAD_GPS fix 38.388019 33.742263 924.4 (etiket olmadan)
            elif re.search(r'PAYLOAD_GPS fix [\d.-]+ [\d.-]+ [\d.-]+', data_str):
                payload_fix_match = re.search(r'PAYLOAD_GPS fix ([\d.-]+) ([\d.-]+) ([\d.-]+)', data_str)
                if payload_fix_match:
                    self.telemetry.payload_latitude = float(payload_fix_match.group(1))
                    self.telemetry.payload_longitude = float(payload_fix_match.group(2))
                    self.telemetry.payload_gps_altitude = float(payload_fix_match.group(3))
                    self.telemetry.payload_gps_valid = True  # fix = valid
                    self.add_log(f"🛰️ Format fix matched: lat={self.telemetry.payload_latitude}, lon={self.telemetry.payload_longitude}, alt={self.telemetry.payload_gps_altitude} (FIX)")

            # Format 1c: PAYLOAD_GPS nofix 11.111110 22.222219 0.0 (etiket olmadan)
            elif re.search(r'PAYLOAD_GPS nofix [\d.-]+ [\d.-]+ [\d.-]+', data_str):
                payload_nofix_simple_match = re.search(r'PAYLOAD_GPS nofix ([\d.-]+) ([\d.-]+) ([\d.-]+)', data_str)
                if payload_nofix_simple_match:
                    self.telemetry.payload_latitude = float(payload_nofix_simple_match.group(1))
                    self.telemetry.payload_longitude = float(payload_nofix_simple_match.group(2))
                    self.telemetry.payload_gps_altitude = float(payload_nofix_simple_match.group(3))
                    self.telemetry.payload_gps_valid = False  # nofix = invalid
                    self.add_log(f"🛰️ Format nofix simple matched: lat={self.telemetry.payload_latitude}, lon={self.telemetry.payload_longitude}, alt={self.telemetry.payload_gps_altitude} (NOFIX)")

            # Format 2: PAYLOAD_GPS:lat,lon,alt (eski format)
            elif re.search(r'PAYLOAD_GPS:([\d.-]+),([\d.-]+),([\d.-]+)', data_str):
                payload_match = re.search(r'PAYLOAD_GPS:([\d.-]+),([\d.-]+),([\d.-]+)', data_str)
                if payload_match:
                    self.telemetry.payload_latitude = float(payload_match.group(1))
                    self.telemetry.payload_longitude = float(payload_match.group(2))
                    self.telemetry.payload_gps_altitude = float(payload_match.group(3))
                    self.telemetry.payload_gps_valid = True
                    self.add_log(f"🛰️ Format 2 matched: lat={self.telemetry.payload_latitude}, lon={self.telemetry.payload_longitude}, alt={self.telemetry.payload_gps_altitude}")

            # Format 3: Ayrı ayrı değerler
            else:
                # Payload LAT LON
                pl_gps_match = re.search(r'GPS:([\d.-]+),([\d.-]+)', data_str)
                if pl_gps_match:
                    self.telemetry.payload_latitude = float(pl_gps_match.group(1))
                    self.telemetry.payload_longitude = float(pl_gps_match.group(2))
                
                # Payload ALT
                pl_gps_alt_match = re.search(r'GPS_ALT:([\d.-]+)', data_str)
                if pl_gps_alt_match:
                    self.telemetry.payload_gps_altitude = float(pl_gps_alt_match.group(1))
                    
                # GPS valid kontrolü
                if any([pl_gps_match, pl_gps_alt_match]):
                    self.telemetry.payload_gps_valid = True
                    self.add_log(f"🛰️ Format 3 valid: lat={self.telemetry.payload_latitude}, lon={self.telemetry.payload_longitude}, alt={self.telemetry.payload_gps_altitude}")

            # Format 4: NMEA formatı (GPGGA)
            if data_str.startswith('$GPGGA'):
                try:
                    parts = data_str.split(',')
                    if len(parts) >= 15 and parts[2] and parts[4] and parts[9]:
                        # Latitude dönüştürme (DDMM.MMMMM -> DD.DDDDDD)
                        lat_raw = float(parts[2])
                        lat_deg = int(lat_raw / 100)
                        lat_min = lat_raw - (lat_deg * 100)
                        latitude = lat_deg + (lat_min / 60)
                        if parts[3] == 'S':
                            latitude = -latitude
                        
                        # Longitude dönüştürme (DDDMM.MMMMM -> DDD.DDDDDD)
                        lon_raw = float(parts[4])
                        lon_deg = int(lon_raw / 100)
                        lon_min = lon_raw - (lon_deg * 100)
                        longitude = lon_deg + (lon_min / 60)
                        if parts[5] == 'W':
                            longitude = -longitude
                        
                        # Altitude
                        altitude = float(parts[9])
                        
                        self.telemetry.payload_latitude = latitude
                        self.telemetry.payload_longitude = longitude
                        self.telemetry.payload_gps_altitude = altitude
                        self.telemetry.payload_gps_valid = True
                        self.add_log(f"🛰️ NMEA format matched: lat={latitude}, lon={longitude}, alt={altitude}")
                        
                except (ValueError, IndexError):
                    self.add_log(f"❌ NMEA parse hatası: {data_str}")
                    
            # Invalid durumu kontrolü (sadece GPS:invalid için)
            if 'GPS:invalid' in data_str:
                self.telemetry.payload_gps_valid = True
                # nofix durumunda koordinatları sıfırlama, sadece valid flag'ini false yap
            
            # Payload gyro verilerini parse et
            # gX(roll)=102.4 gY(pitch)=-8.4 gZ(yaw)=-39.8 formatı
            self.add_log(f"🛰️ Payload gyro parse denemesi: {data_str}")
            
            payload_gx_match = re.search(r'gX\(roll\)=([\d.-]+)', data_str)
            if payload_gx_match:
                self.telemetry.payload_gyro_x = float(payload_gx_match.group(1))
                self.add_log(f"🛰️ Payload Gyro X parsed: {self.telemetry.payload_gyro_x}")
            else:
                self.add_log(f"🛰️ Payload Gyro X match bulunamadı")
            
            payload_gy_match = re.search(r'gY\(pitch\)=([\d.-]+)', data_str)
            if payload_gy_match:
                self.telemetry.payload_gyro_y = float(payload_gy_match.group(1))
                self.add_log(f"🛰️ Payload Gyro Y parsed: {self.telemetry.payload_gyro_y}")
            else:
                self.add_log(f"🛰️ Payload Gyro Y match bulunamadı")
            
            payload_gz_match = re.search(r'gZ\(yaw\)=([\d.-]+)', data_str)
            if payload_gz_match:
                self.telemetry.payload_gyro_z = float(payload_gz_match.group(1))
                self.add_log(f"🛰️ Payload Gyro Z parsed: {self.telemetry.payload_gyro_z}")
            else:
                self.add_log(f"🛰️ Payload Gyro Z match bulunamadı")
            
            # Eğer gyro verisi parse edildiyse log'la
            if payload_gx_match or payload_gy_match or payload_gz_match:
                self.add_log(f"🛰️ Payload Gyro verileri parse edildi: X={self.telemetry.payload_gyro_x:.1f}, Y={self.telemetry.payload_gyro_y:.1f}, Z={self.telemetry.payload_gyro_z:.1f}")
            
            # Sıvı seviye verilerini de parse et (payload portundan geliyor)
            self.parse_all_liquid_data(data_str)
            
            # Payload GPS verileri parse edildiyse (valid veya invalid olsun) güncelle
            if (self.telemetry.payload_latitude != 0.0 or self.telemetry.payload_longitude != 0.0 or 
                self.telemetry.payload_gps_altitude != 0.0):
                self.telemetry.payload_last_update = datetime.now().strftime("%H:%M:%S")
                self.telemetry.payload_packet_count += 1
                
                payload_status = f"{self.telemetry.payload_latitude:.6f},{self.telemetry.payload_longitude:.6f}"
                #valid_status = "VALID" if self.telemetry.payload_gps_valid else "INVALID (NOFIX)"
                valid_status = "VALID"
                self.add_log(f"🛰️ Payload GPS: Alt={self.telemetry.payload_gps_altitude:.1f}m, Pos={payload_status}, Status={valid_status}")
            else:
                self.add_log(f"🛰️ Payload GPS parse edilemedi: {data_str}")
            
            return True
            
        except Exception as e:
            self.add_log(f"❌ Payload GPS Parse hatası: {e} - Data: {data_str}")
            return False
    
    def create_hyi_packet(self) -> bytes:
        """HYİ paketi oluştur - Dokümana uygun format (78 byte)"""
        packet = bytearray(78)
        
        # Header (Byte 1-4: 0xFF, 0xFF, 0x54, 0x52)
        packet[0:4] = [0xFF, 0xFF, 0x54, 0x52]
        
        # Takım ID (Byte 5)
        packet[4] = self.team_id
        
        # Paket Sayacı (Byte 6)
        packet[5] = self.packet_counter
        
        # İrtifa (Byte 7-10) - Basınç sensörü irtifası
        packet[6:10] = struct.pack('<f', self.telemetry.altitude)
        
        # Roket GPS İrtifa (Byte 11-14)
        packet[10:14] = struct.pack('<f', self.telemetry.gps_altitude if self.telemetry.gps_valid else 0.0)
        
        # Roket Enlem (Byte 15-18)
        packet[14:18] = struct.pack('<f', self.telemetry.gps_latitude if self.telemetry.gps_valid else 0.0)
        
        # Roket Boylam (Byte 19-22)
        packet[18:22] = struct.pack('<f', self.telemetry.gps_longitude if self.telemetry.gps_valid else 0.0)
        
        # Görev yükü GPS İrtifa (Byte 23-26) - Payload GPS'den
        packet[22:26] = struct.pack('<f', self.telemetry.payload_gps_altitude)
        
        # Görev yükü Enlem (Byte 27-30) - Payload GPS'den
        packet[26:30] = struct.pack('<f', self.telemetry.payload_latitude)
        
        # Görev yükü Boylam (Byte 31-34) - Payload GPS'den
        packet[30:34] = struct.pack('<f', self.telemetry.payload_longitude)
        
        # Debug: Payload GPS verilerini log'la
        if (self.telemetry.payload_latitude != 0.0 or self.telemetry.payload_longitude != 0.0 or 
            self.telemetry.payload_gps_altitude != 0.0):
            self.add_log(f"📡 HYİ'ye gönderilen Payload GPS: Alt={self.telemetry.payload_gps_altitude:.1f}m, Lat={self.telemetry.payload_latitude:.6f}, Lon={self.telemetry.payload_longitude:.6f}")
        
        # Kademe GPS İrtifa (Byte 35-38) - Sıfır
        packet[34:38] = struct.pack('<f', 0.0)
        
        # Kademe Enlem (Byte 39-42) - Sıfır
        packet[38:42] = struct.pack('<f', 0.0)
        
        # Kademe Boylam (Byte 43-46) - Sıfır
        packet[42:46] = struct.pack('<f', 0.0)
        
        # Jiroskop X (Byte 47-50)
        packet[46:50] = struct.pack('<f', self.telemetry.gyro_x)
        
        # Jiroskop Y (Byte 51-54)
        packet[50:54] = struct.pack('<f', self.telemetry.gyro_y)
        
        # Jiroskop Z (Byte 55-58)
        packet[54:58] = struct.pack('<f', self.telemetry.gyro_z)
        
        # İvme X (Byte 59-62)
        packet[58:62] = struct.pack('<f', self.telemetry.accel_x)
        
        # İvme Y (Byte 63-66)
        packet[62:66] = struct.pack('<f', self.telemetry.accel_y)
        
        # İvme Z (Byte 67-70)
        packet[66:70] = struct.pack('<f', self.telemetry.accel_z)
        
        # Açı (Byte 71-74)
        packet[70:74] = struct.pack('<f', self.telemetry.pitch)
        
        # Durum (Byte 75) - Paraşüt durumu
        # P1 ve P2 değerlerine göre durum hesapla
        if self.telemetry.p1 and self.telemetry.p2:
            packet[74] = 4  # Her iki paraşüt de tetiklendi
        elif self.telemetry.p1 and not self.telemetry.p2:
            packet[74] = 2  # Sadece birincil paraşüt tetiklendi
        elif not self.telemetry.p1 and self.telemetry.p2:
            packet[74] = 3  # Sadece ikincil paraşüt tetiklendi
        else:
            packet[74] = 1  # Hiçbir paraşüt tetiklenmedi
        
        # CheckSum (Byte 76) - Byte 5'ten Byte 75'e kadar toplam mod 256
        checksum = sum(packet[4:75]) % 256
        packet[75] = checksum
        
        # Footer (Byte 77-78: 0x0D, 0x0A)
        packet[76] = 0x0D
        packet[77] = 0x0A
        
        return bytes(packet)
    
    def send_to_hyi(self) -> bool:
        """HYİ'ye veri gönder"""
        if not self.hyi_connection or not self.hyi_connection.is_open:
            self.add_log("⚠️ HYİ bağlantısı yok - veri gönderilemiyor")
            return False
        
        # Minimum 100ms aralık kontrolü (dokümana uygun)
        now = time.time()
        if now - self.last_hyi_send < 0.1:
            return False
        
        try:
            packet = self.create_hyi_packet()
            self.hyi_connection.write(packet)
            self.packet_counter = (self.packet_counter + 1) % 256
            self.last_hyi_send = now
            
            # Paket detaylarını log'la
            checksum = packet[75]
            payload_status = "VALID" if self.telemetry.payload_gps_valid else "INVALID"
            parachute_status = f"P1={'AÇIK' if self.telemetry.p1 else 'KAPALI'}, P2={'AÇIK' if self.telemetry.p2 else 'KAPALI'}"
            status_value = packet[74]
            self.add_log(f"📤 HYİ Paket #{self.packet_counter}: Alt={self.telemetry.altitude:.1f}m, Payload GPS={payload_status}, Paraşüt={parachute_status}, Durum={status_value}, CRC={checksum:02X}")
            return True
            
        except Exception as e:
            self.add_log(f"❌ HYİ gönderim hatası: {e}")
            return False
    
    def start_lora_receiver(self):
        """LoRa veri alma döngüsü"""
        if not self.lora_connection:
            self.add_log("❌ LoRa bağlantısı yok")
            return
        
        def receive_loop():
            buffer = ""
            self.add_log("📡 LoRa veri alma başlatıldı")
            
            while self.running:
                try:
                    if self.lora_connection and self.lora_connection.is_open and self.lora_connection.in_waiting > 0:
                        data = self.lora_connection.read(self.lora_connection.in_waiting).decode('utf-8', errors='ignore')
                        buffer += data
                        
                        # Satır sonları ile verileri ayır
                        while '\n' in buffer or '\r' in buffer:
                            if '\n' in buffer:
                                line, buffer = buffer.split('\n', 1)
                            else:
                                line, buffer = buffer.split('\r', 1)
                            
                            line = line.strip()
                            if line and 'ALT:' in line:
                                if self.parse_lora_data(line):
                                    # Otomatik gönderim aktifse HYİ'ye gönder
                                    if self.auto_send:
                                        self.send_to_hyi()
                    
                    time.sleep(0.01)
                    
                except Exception as e:
                    self.add_log(f"❌ LoRa alma hatası: {e}")
                    time.sleep(1)
            
            self.add_log("🛑 LoRa veri alma durduruldu")
        
        receive_thread = threading.Thread(target=receive_loop)
        receive_thread.daemon = True
        receive_thread.start()
    
    def start_payload_gps_receiver(self):
        """Payload GPS veri alma döngüsü"""
        if not self.payload_gps_connection:
            self.add_log("❌ Payload GPS bağlantısı yok")
            return
        
        def receive_loop():
            buffer = ""
            self.add_log("🛰️ Payload GPS veri alma başlatıldı")
            
            while self.running:
                try:
                    # Port durumunu kontrol et
                    if self.payload_gps_connection and self.payload_gps_connection.is_open:
                        # Gelen veri var mı kontrol et
                        if self.payload_gps_connection.in_waiting > 0:
                            data = self.payload_gps_connection.read(self.payload_gps_connection.in_waiting).decode('utf-8', errors='ignore')
                            buffer += data
                            
                            # Debug: Gelen ham veriyi log'la
                            if data.strip():
                                self.add_log(f"🛰️ Raw Payload Data: {repr(data)}")
                            
                            # Satır sonları ile verileri ayır
                            while '\n' in buffer or '\r' in buffer:
                                if '\n' in buffer:
                                    line, buffer = buffer.split('\n', 1)
                                else:
                                    line, buffer = buffer.split('\r', 1)
                                
                                line = line.strip()
                                if line:
                                    self.add_log(f"🛰️ Payload Line: {line}")
                                    # Daha geniş format desteği - yeni formatlar eklendi
                                    if (('GPS:' in line) or ('PL_' in line) or line.startswith('$GPGGA') or 
                                        'PAYLOAD' in line or 'LAT:' in line or 'LON:' in line or 'ALT:' in line or
                                        'ALL=' in line or 'PAYLOAD_GPS nofix' in line or 'gX(' in line or 'gY(' in line or 'gZ(' in line):
                                        self.parse_payload_gps_data(line)
                                    else:
                                        self.add_log(f"🛰️ Payload format tanınmadı: {line}")
                        else:
                            # Veri yoksa port durumunu log'la
                            if time.time() % 10 < 0.1:  # Her 10 saniyede bir
                                self.add_log(f"🛰️ Payload GPS port durumu: {self.payload_gps_connection.port}, in_waiting: {self.payload_gps_connection.in_waiting}")
                    
                    time.sleep(0.1)  # Daha sık kontrol et
                    
                except Exception as e:
                    self.add_log(f"❌ Payload GPS alma hatası: {e}")
                    time.sleep(1)
            
            self.add_log("🛑 Payload GPS veri alma durduruldu")
        
        receive_thread = threading.Thread(target=receive_loop)
        receive_thread.daemon = True
        receive_thread.start()
    

    
    def start_system(self, team_id: int, lora_port: str, payload_gps_port: str, hyi_port: str, auto_send: bool = True):
        """Tüm sistemi başlat"""
        self.team_id = team_id
        self.auto_send = auto_send
        self.packet_counter = 0
        
        self.add_log(f"🚀 Sistem başlatılıyor - Takım ID: {team_id}")
        
        # Önce eski bağlantıları kapat
        self.stop_system()
        
        # Bağlantı sayacı
        connected_ports = 0
        
        # LoRa bağlantısını kur (opsiyonel)
        if lora_port and lora_port != "none":
            if self.connect_lora(lora_port):
                connected_ports += 1
            else:
                self.add_log("⚠️ LoRa bağlantısı başarısız, sadece diğer portlarla devam ediliyor")
        
        # Payload GPS bağlantısını kur (opsiyonel)
        if payload_gps_port and payload_gps_port != "none":
            if self.connect_payload_gps(payload_gps_port):
                connected_ports += 1
            else:
                self.add_log("⚠️ Payload GPS bağlantısı başarısız, sadece diğer portlarla devam ediliyor")
        
        # HYİ bağlantısını kur (opsiyonel)
        if hyi_port and hyi_port != "none":
            if self.connect_hyi(hyi_port):
                connected_ports += 1
            else:
                self.add_log("⚠️ HYİ bağlantısı başarısız, sadece diğer portlarla devam ediliyor")
        
        # En az bir port bağlı olmalı
        if connected_ports == 0:
            self.add_log("❌ Hiçbir port bağlanamadı, sistem başlatılamıyor")
            return False
        
        # Sistemi başlat
        self.running = True
        
        # Sadece bağlı olan portların receiver'larını başlat
        if self.lora_connection and self.lora_connection.is_open:
            self.start_lora_receiver()
        
        # Payload GPS varsa onun da receiver'ını başlat
        if self.payload_gps_connection and self.payload_gps_connection.is_open:
            self.start_payload_gps_receiver()
        

        
        auto_status = "AKTIF" if auto_send else "PASİF"
        payload_status = "AKTIF" if self.payload_gps_connection else "PASİF"
        lora_status = "AKTIF" if self.lora_connection else "PASİF"
        hyi_status = "AKTIF" if self.hyi_connection else "PASİF"
        
        self.add_log(f"✅ Sistem hazır! Bağlı portlar: {connected_ports}")
        self.add_log(f"   LoRa: {lora_status}, Payload GPS: {payload_status}, HYİ: {hyi_status}")
        self.add_log(f"   Otomatik gönderim: {auto_status}")
        return True
    
    def stop_system(self):
        """Sistemi durdur"""
        self.running = False
        
        if self.lora_connection and self.lora_connection.is_open:
            self.lora_connection.close()
            self.add_log("🔌 LoRa bağlantısı kapatıldı")
        
        if self.payload_gps_connection and self.payload_gps_connection.is_open:
            self.payload_gps_connection.close()
            self.add_log("🔌 Payload GPS bağlantısı kapatıldı")
            
        if self.hyi_connection and self.hyi_connection.is_open:
            self.hyi_connection.close()
            self.add_log("🔌 HYİ bağlantısı kapatıldı")


        
        time.sleep(0.5)  # Thread'lerin kapanması için bekle

# Flask uygulamasına, projenin bir üst klasöründeki "build" klasörünü gösteriyoruz
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # backend klasörü
BUILD_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', 'build'))  # ../build

# Flask Web API
#app = Flask(__name__)
app = Flask(__name__, static_folder=BUILD_DIR)
CORS(app)

# Global ground station instance
ground_station = TEKNOFESTGroundStation()

# React frontend dosyalarını sunan route
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    file_path = os.path.join(app.static_folder, path)

    if os.path.exists(file_path) and os.path.isfile(file_path):
        return send_from_directory(app.static_folder, path)
    else:
        # Eğer dosya yoksa React Router için index.html dön
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/ports', methods=['GET'])
def api_get_ports():
    """Mevcut COM portlarını listele"""
    try:
        ports = ground_station.get_available_ports()
        return jsonify({
            'success': True,
            'ports': ports
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/connect', methods=['POST'])
def api_connect():
    """Sistem bağlantısını başlat"""
    try:
        data = request.get_json()
        team_id = int(data.get('teamId', 42))
        lora_port = data.get('loraPort', 'none')
        payload_gps_port = data.get('payloadGpsPort', 'none')
        hyi_port = data.get('hyiPort', 'none')
        auto_send = data.get('autoSend', True)
        
        success = ground_station.start_system(team_id, lora_port, payload_gps_port, hyi_port, auto_send)
        
        return jsonify({
            'success': success,
            'message': 'Bağlantı başarılı' if success else 'Bağlantı başarısız'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/disconnect', methods=['POST'])
def api_disconnect():
    """Sistem bağlantısını kes"""
    try:
        ground_station.stop_system()
        return jsonify({
            'success': True,
            'message': 'Bağlantı kesildi'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/telemetry', methods=['GET'])
def api_telemetry():
    """Güncel telemetri verisini döndür"""
    try:
        return jsonify({
            'success': True,
            'data': asdict(ground_station.telemetry)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/logs', methods=['GET'])
def api_logs():
    """Son log mesajlarını döndür"""
    try:
        logs = ground_station.get_logs()
        return jsonify({
            'success': True,
            'logs': logs
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/auto-send', methods=['POST'])
def api_auto_send():
    """Otomatik gönderim ayarını değiştir"""
    try:
        data = request.get_json()
        enabled = data.get('enabled', True)
        ground_station.auto_send = enabled
        
        message = f'Otomatik gönderim {"AKTIF" if enabled else "PASİF"}'
        ground_station.add_log(f"⚙️ {message}")
        
        return jsonify({
            'success': True,
            'message': message
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/send-packet', methods=['POST'])
def api_send_packet():
    """Manuel paket gönder"""
    try:
        success = ground_station.send_to_hyi()
        return jsonify({
            'success': success,
            'message': 'Paket gönderildi' if success else 'Paket gönderilemedi'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/export-data', methods=['GET'])
def api_export_data():
    """Verileri dışa aktar"""
    try:
        telemetry_data = asdict(ground_station.telemetry)
        telemetry_data['timestamp'] = datetime.now().isoformat()
        
        # JSON formatında dışa aktar
        response = jsonify(telemetry_data)
        response.headers['Content-Disposition'] = 'attachment; filename=telemetry_data.json'
        return response
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/export/txt', methods=['GET'])
def api_export_txt():
    """Verileri TXT formatında dışa aktar"""
    try:
        telemetry = ground_station.telemetry
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # TXT formatında veri oluştur
        txt_content = f"""TEKNOFEST Telemetri Verileri
Export Tarihi: {timestamp}
=====================================

ROKET VERİLERİ:
----------------
İrtifa: {telemetry.altitude:.2f} m
Maksimum İrtifa: {telemetry.max_altitude:.2f} m
GPS İrtifa: {telemetry.gps_altitude:.2f} m
Delta Y: {telemetry.delta_y:.2f}
Ateşlendi: {'Evet' if telemetry.fired else 'Hayır'}

Jiroskop (X, Y, Z):
X: {telemetry.gyro_x:.2f}°
Y: {telemetry.gyro_y:.2f}°
Z: {telemetry.gyro_z:.2f}°

İvmeölçer (X, Y, Z):
X: {telemetry.accel_x:.2f} m/s²
Y: {telemetry.accel_y:.2f} m/s²
Z: {telemetry.accel_z:.2f} m/s²

Pitch: {telemetry.pitch:.2f}°

ROKET GPS:
-----------
Enlem: {telemetry.gps_latitude:.6f}°
Boylam: {telemetry.gps_longitude:.6f}°
Geçerli: {'Evet' if telemetry.gps_valid else 'Hayır'}

PAYLOAD GPS:
-------------
İrtifa: {telemetry.payload_gps_altitude:.2f} m
Enlem: {telemetry.payload_latitude:.6f}°
Boylam: {telemetry.payload_longitude:.6f}°
Geçerli: {'Evet' if telemetry.payload_gps_valid else 'Hayır'}

SIVI SEVİYE VERİLERİ (ALL: formatı):
---------------------------------------
Raw Binary Data: {telemetry.all_liquid_data}
Toplam Sensör: {len(telemetry.liquid_levels)}

Sensör Değerleri:
"""
        
        # Sıvı seviye sensör değerlerini ekle
        for i, level in enumerate(telemetry.liquid_levels):
            txt_content += f"Sensör {i+1:2d}: {level:3d} (0-255)\n"
        
        txt_content += f"""
PAKET BİLGİLERİ:
------------------
Roket Son Paket: {telemetry.last_update or 'Henüz veri yok'}
Roket Toplam Paket: {telemetry.packet_count}
Payload Son Paket: {telemetry.payload_last_update or 'Henüz veri yok'}
Payload Toplam Paket: {telemetry.payload_packet_count}

=====================================
Export tamamlandı: {timestamp}
"""
        
        return jsonify({
            'success': True,
            'data': txt_content
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })


@app.route('/health', methods=['GET'])
def health_check():
    """Sağlık kontrolü"""
    return jsonify({
        'status': 'healthy',
        'running': ground_station.running,
        'connected': {
            'lora': ground_station.lora_connection is not None and ground_station.lora_connection.is_open,
            'payload_gps': ground_station.payload_gps_connection is not None and ground_station.payload_gps_connection.is_open,
            'hyi': ground_station.hyi_connection is not None and ground_station.hyi_connection.is_open
        },
        'telemetry': asdict(ground_station.telemetry),
        'timestamp': datetime.now().isoformat()
    })

if __name__ == "__main__":
    ascii_banner = pyfiglet.figlet_format("yusufmertusta")
    print(ascii_banner)
    
    print("🚀 TOBB ETU Yer İstasyonu v2.0 - creator: yusufmertusta")
    print("=" * 50)
    print("🌐 React Frontend: http://localhost:3000")
    print("🔌 Flask Backend: http://localhost:8000")
    print("📡 LoRa + Payload GPS Support")
    print("=" * 50)
    
    try:
        app.run(
            host='0.0.0.0',
            port=8000,
            debug=False,  # Production'da False olmalı
            use_reloader=False  # Threading ile uyumluluk için
        )
    except KeyboardInterrupt:
        print("\n🛑 Server durduruldu")
        ground_station.stop_system()