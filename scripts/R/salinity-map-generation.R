library(dplyr)
library(tidyverse)
library(sf)
library(terra)
library(ncdf4)
library(sf)

# Set local working directory
setwd("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/data/")

# Read in basemap
basemap <- terra::rast("Test_Basemap.tif")

# Plot basemap
plotRGB(basemap)

# Read from the SEANOE atlas
atlas <- ncdf4::nc_open("SEANOE_AtlasForEnvironmentalConditions.nc")

# Select variables:
long <- ncdf4::ncvar_get(atlas, "longitude") # Dims: 348
lati <- ncdf4::ncvar_get(atlas, "latitude") # Dims: 567
sal_surface <- ncdf4::ncvar_get(atlas, "salinity_surface") # Dims: 348x567x12
sal_bottom <- ncdf4::ncvar_get(atlas, "salinity_bottom") # Dims: 348x567x12
sal_ts <- ncdf4::ncvar_get(atlas, "timeseries_salinity")
sal_wqmp <- ncdf4::ncvar_get(atlas, "wqmp_salinity")

# Transpose the lat / lon dimensions so terra::rast reads dimensions properly
t_sal_surface <- aperm(sal_surface, perm = c(2, 1, 3))
t_sal_bottom <- aperm(sal_bottom, perm = c(2, 1, 3))

# Close file once done
ncdf4::nc_close(atlas)
rm(atlas)

# Convert salinity data to raster
sal_surface_r <- terra::rast(t_sal_surface)
sal_bottom_r <- terra::rast(t_sal_bottom)

# Define extent
xmin <- min(long)
xmax <- max(long)
ymin <- min(lati)
ymax <- max(lati)

ext(sal_surface_r) <- c(xmin, xmax, ymin, ymax)
crs(sal_surface_r) <- "EPSG:4326"

ext(sal_bottom_r) <- c(xmin, xmax, ymin, ymax)
crs(sal_bottom_r) <- "EPSG:4326"

# Flip and reverse raster
sal_surface_r_flip <- terra::flip(sal_surface_r, direction="vertical")
sal_bottom_r_flip <- terra::flip(sal_bottom_r, direction="vertical")


# Take example of september
sep_sal <- sal_surface_r_flip[[9]]

# Now want to crop salinity raster to basemap extent
print(crs(basemap))
print(crs(sep_sal))

# First reproject sep_sal
sep_sal_reproject <- project(sep_sal, crs(basemap))

# Crop salinity raster to basemap extent
sep_sal_crop <- crop(sep_sal_reproject, basemap)

plotRGB(basemap)
plot(sep_sal_crop, add=TRUE)


## Read in test data for plotting
sturgeon  <- read_csv("sturgeon_data.csv")

# Transform to sf
sturgeon_sf <- sf::st_as_sf(sturgeon, coords=c("HubLongitude", "HubLatitude"), crs = 4326)

# Reproject for plotting
sturgeon_sf_reproject <- sf::st_transform(sturgeon_sf, crs(basemap))

plot(sturgeon_sf_reproject, add=TRUE, col = "red")
