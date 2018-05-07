
## Release Notes
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