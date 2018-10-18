
## Release Notes
### Version 1.2.3
```
1. แก้แสดง overlay เมื่อ scroll
```
### Version 1.2.0
```
1. เพิ่ม Logo โดยการใช้ภาพ svg
```
### Version 1.1.9
```
1. อัพเดตคำอธิบายบางส่วนของ ReverseGeocodingAPI document
```
### Version 1.1.8
```
1. อัพเดตคำอธิบายบางส่วนของ ReverseGeocodingAPI และ SuggestAPI document
```
### Version 1.1.7
```
1. อัพเดตคำอธิบายบางส่วนของ ReverseGeocodingAPI document
```
### Version 1.1.6
```
1. อัพเดต ReverseGeocodingAPI document
```
### Version 1.1.5
```
1. อัพเดต SearhAPI document
```
### Version 1.1.4
```
1. อัพเดต SearhAPI document
2. แก้ปัญหาเวลาใช้ Style URL แล้วไม่สามารถลบ apiKey และ appId ออกได้
```
### Version 1.1.3
```
1. แก้ apidoc
```
### Version 1.1.2
```
1. แก้บัคที่สีของ Logo MapMagic ไม่เปลี่ยนไปตามสีของพื้น map
```
### Version 1.1.1
```
1. แก้ปัญหาเวลาใช้ Style URL แล้วไม่สามารถลบ apiKey และ appId ออกได้
2. แก้ปัญหาที่ใส่ Option style ตอน init แล้ว error
3. เพิ่มรูปแบบการใช้คีย์ใน Options คือ apiKey, appId, styleURL
```
### Version 1.1.0
```
1. เพิ่มฟังก์ชันการเปลี่ยน Style ของ Map
2. แก้ปัญหาเวลาใช้ Style URL แล้วไม่สามารถลบ api_key และ app_id ออกได้
```
### Version 1.0.0
```
1. สามารถเลือก Style ของ Map ได้
2. สามารถเลือกภาษาที่จะแสดงบน Map ได้
```
### Version 0.4.0
```
1. เพิ่มการปรับตำแหน่งของ Marker โดยเพิ่ม option offset:[x,y]
2. เพิ่มการเปิดใช้งาน navigation control
```
### Version 0.3.1
```
1. Render map tile บนเว็บบราวเซอร์
2. ฟังก์ชันพื้นฐานการใช้งานและแสดงผลบนแผนที่ (Marker, Line, Polygon)

  2.1 addMarker ที่สามารถเลือกการแสดงหมุดในแบบของ default marker , custom marker , image marker รวมถึงการเพิ่มฟังก์ชันการลากวางหมุดด้วยฟังก์ชัน draggable Marker

  2.2 addLine ใช้วาดเส้นลงและกำหนด Properties บนแผนที่

  2.3 addPolygon สำหรับวาด พื้นที่ polygon บนแผนที่

  2.4 เพิ่มฟังก์ชันการป้องกันการเลื่อนแผนที่ด้วยนิ้วเดียวในกรณีเล่นในโทรศัพท์หรือการใช้ scroll mouse บน desktop แล้วทำให้เกิดปัญหาเลื่อนแผนที่โดยไม่ได้ตั้งใจ
```