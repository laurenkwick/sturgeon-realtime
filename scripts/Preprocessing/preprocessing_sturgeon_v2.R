library(dplyr)
library(sf)
library(lubridate)
library(tidyr)

#################
### READ DATA ###
#################

sturgeon <- read.csv("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/data/sturgeon_sep2025.csv")
hubs <- read.csv("C:/Users/wicklk/Documents/GitHub/sturgeon-realtime/data/sturgeon_data.csv")

##############################
### FILTER AND FORMAT DATA ###
##############################

# Filter by sturgeon points
sturgeon <- sturgeon %>%
  filter(Animal.Common.Name == "Atlantic sturgeon")

# Join to hub table
sturgeon <- inner_join(sturgeon, hubs, by = join_by(Hub==Hub))

# Set time window interval
interval <- "4 hours"

sturgeon_summary <- sturgeon %>%
  mutate(
    Date.Time = lubridate::as_datetime(Date.and.Time..UTC.),
    Date.Time.Rounded = floor_date(Date.Time, interval)
  ) %>%
  # Group by fish ID and time bucket to evaluate multi-hub visits
  group_by(ID, Date.Time.Rounded) %>%
  # Identify the chronological arrival order for each distinct humb in the same window
  mutate(
    first_seen = min(Date.Time),
    distinct_hubs = n_distinct(Hub)
  ) %>%
  group_by(ID, Date.Time.Rounded, Hub) %>%
  summarize(
    arrival_time = min(Date.Time),
    ping_count = n(),
    distinct_hubs = first(distinct_hubs),
    .groups = "drop"
  ) %>%
  # Assign tiebreaker - NA if only 1 Hub was visited, otherwise 1, 2, 3... in arrival order
  group_by(ID, Date.Time.Rounded) %>%
  arrange(arrival_time, .by_group = TRUE) %>%
  mutate(
    tiebreaker = if_else(distinct_hubs > 1, row_number(), NA_integer_)
  ) %>%
  ungroup()

# Extract date range from the dataset
start_date <- min(sturgeon_summary$Date.Time.Rounded)
end_date <- max(sturgeon_summary$Date.Time.Rounded)


### Build full sequence of 4-hour buckets
all_buckets <- tibble(
  Date.Time.Rounded = seq(start_date, end_date, by = interval)
)

sturgeon_final <- sturgeon_summary %>%
  # Create a complete grid for all fish across all time buckets
  complete(ID, Date.Time.Rounded = all_buckets$Date.Time.Rounded) %>%
  group_by(ID) %>%
  arrange(Date.Time.Rounded, tiebreaker, .by_group = TRUE) %>%
  # Carry forward the last known hub, then backfill for initial leading NA intervals
  fill(Hub, .direction = "down") %>%
  fill(Hub, .direction = "up") %>%
  ungroup()




#write.csv(sturgeon_clean, "C:/Users/wicklk/Documents/GitHub/d3-book/static_basemap/sturgeon_details.csv")
