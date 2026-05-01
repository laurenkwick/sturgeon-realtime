# sturgeon-realtime

# Basemap Instructions

This folder will include files for using a static basemap and overlaying vector points on top of
it using D3. 

## Geotiff Info
Original geotiff is stored in this folder as `staticBasemap_v1.tif`. 

### Extent

*Note* To find the decimal degree version of your geotiff extent in ArcGIS Pro:
Right click on Map in contents page > Properties > Extent > Use custom extent > Choose layer

| Location Name | Location (m)| Location (decimal degrees) |
|---------------|-------------|----------------------------|
| Top | 4525670.659437 | 37.6184908 N |
| Bottom | 4453690.921970 | 37.1045584 N |
| Left | -8638330.381138 | 77.5994421 W |
| Right | -8524584.623165 | 76.5776466 W |

In d3 code, we define the decimal degrees extent once converting geotiff -> png. 
PNG file because that is a web friendly image format. 

Current image has dimensions width 1280px and height 810px, so make sure that
any new PNGs matche these dimensions

### Spatial Reference 

* **Projected Coordinate System** WGS 1984 Web Mercator
* **Projection** Mercator Auxiliary Sphere
* **WKID** 3857
* **Previous WKID** 102100
* **Authority** EPSG
* **Linear Unit** Meters (1.0)

* **Geographic Coordinate System** WGS 1984
* **WKID** 4326
* **Authority** EPSG
* **Angular Unit** Degree (0.0174532925199433)
* **Prime Meridian** Greenwich (0.0)
* **Datum** D WGS  1984
* **Spheroid** WGS 1984
* **Semimajor Axis** 6378137.0
* **Semiminor Axis** 6356752.314245179
* **Inverse Flattening** 298.257223563