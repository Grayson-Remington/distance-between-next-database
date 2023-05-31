import { type NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import { SignIn, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { LoadingPage, LoadingSpinner } from "~/components/loading";
import { RiPinDistanceFill } from "react-icons/ri";
import { useState, useEffect, useRef } from "react";
import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  DirectionsRenderer,
} from "@react-google-maps/api/";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { getDistance, getCenter } from "geolib";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import parse from "autosuggest-highlight/parse";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { decode } from "@googlemaps/polyline-codec";
import { Decimal } from "@prisma/client/runtime";

interface PlacesAutocompleteProps {
  saved_locations: Saved_Location[] | null;
  setSelected: React.Dispatch<
    React.SetStateAction<{
      description: string;
      main_text: string;
      secondary_text: string;
      lat: number;
      lng: number;
    } | null>
  >;
}

interface Saved_Location {
  id: string;
  createdAt: Date;
  userId: string;
  name: string;
  description: string;
  main_text: string;
  secondary_text: string;
  lat: Decimal;
  lng: Decimal;
}

interface MainTextMatchedSubstrings {
  offset: number;
  length: number;
}
interface StructuredFormatting {
  main_text: string;
  secondary_text: string;
  main_text_matched_substrings?: readonly MainTextMatchedSubstrings[];
}
interface PlaceType {
  description: string;
  structured_formatting: StructuredFormatting;
}

const Saved_LocationView = (props: Saved_Location) => {
  const { mutate: deletefriend } = api.saved_locations.delete.useMutation();

  return (
    <div key={props.id} className="flex w-full gap-2 border-b border-black p-4">
      <div className="flex w-full flex-col gap-2">
        <div className="flex justify-center gap-4 ">
          <span className=" text-xl">{props.name}</span>
          <span>|</span>
          <span>{props.description}</span>
          <span>|</span>
          <button
            className="text-red-700"
            onClick={() => {
              deletefriend({ id: props.id });
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const FriendsList = (saved_locations: {
  saved_locations: Saved_Location[] | null;
}) => {
  if (saved_locations.saved_locations !== null) {
    return (
      <div className="flex flex-col">
        <div className="text-center">
          <h1 className="text-2xl">Saved Locations</h1>
          <h1 className="text-sm underline">
            (saved locations appear in search dropdown)
          </h1>
        </div>

        {saved_locations!.saved_locations!.map((saved_location) => (
          <Saved_LocationView {...saved_location} key={saved_location.id} />
        ))}
      </div>
    );
  } else return <div>Hello</div>;
};
const libraries: (
  | "drawing"
  | "geometry"
  | "localContext"
  | "places"
  | "visualization"
)[] = ["places"];

const Home: NextPage = () => {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  api.saved_locations.getAll.useQuery();
  const [chatResponse, setChatResponse] = useState<string>("");
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [response, setResponse] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [isAddressSaved, setIsAddressSaved] = useState(false);
  const { mutate: create } = api.saved_locations.create.useMutation();

  const [friendname, setFriendName] = useState("");

  const [data2, setData2] = useState<Saved_Location[] | null>(null);
  const { data: saved_locations, isLoading: postsLoading } =
    api.saved_locations.getAll.useQuery();

  useEffect(() => {
    if (saved_locations) {
      const data2 = saved_locations!.map((value, index) => {
        return {
          id: value.saved_location.id,
          createdAt: value.saved_location.createdAt,
          userId: value.saved_location.userId,
          name: value.saved_location.name,
          description: value.saved_location.description,
          main_text: value.saved_location.main_text,
          secondary_text: value.saved_location.secondary_text,
          lat: value.saved_location.lat,
          lng: value.saved_location.lng,
        };
      });
      if (saved_locations.length > 0) {
        setData2(data2);
      }
    }
  }, [saved_locations]);

  const fetchData = async () => {
    const lat = centercoords.lat;
    const lng = centercoords.lng;
    const res = await fetch(`api/ChatGPTRequest?lat=${lat}?lng=${lng}`);
    const data = await res.json();
    setResponse("loaded");
    setChatResponse(data);
    console.log(data);
  };

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const [selected, setSelected] = useState<{
    description: string;
    main_text: string;
    secondary_text: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [selected2, setSelected2] = useState<{
    description: string;
    main_text: string;
    secondary_text: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [array, setArray] = useState<
    [{ lat: number; lng: number }, { lat: number; lng: number }] | null
  >(null);
  useEffect(() => {
    if (selected !== null && selected2 !== null) {
      setArray([selected, selected2]);
    }
  }, [selected, selected2]);

  let distance = 0;
  const [centercoords, setCenterCoords] = useState({
    lat: 37.611624802137484,
    lng: -77.52052094546944,
  });
  if (array !== null) {
    distance = getDistance(array[0], array[1]) * 0.000621371;
  }

  if (!isLoaded) return <div>Loading...</div>;
  const firstOneIndex = chatResponse.search(/1/);
  const afterOne = chatResponse.substring(firstOneIndex);
  const items = afterOne.split(/\d+\. /).slice(1);

  async function calculateRoute() {
    if (selected === null || selected2 === null) {
      return;
    }
    // eslint-disable-next-line no-undef

    const directionsService = new google.maps.DirectionsService();

    const results = await directionsService.route({
      origin: selected,
      destination: selected2,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirectionsResponse(results);

    const LatLngArray = decode(results.routes[0]!.overview_polyline);
    const middleOfArray = LatLngArray[Math.floor(LatLngArray.length / 2)];
    const Objectification = { lat: middleOfArray![0], lng: middleOfArray![1] };

    setCenterCoords(Objectification);
  }
  function clearRoute() {
    setDirectionsResponse(null);

    setSelected(null);
    setSelected2(null);
  }

  return (
    <>
      <Head>
        <title>Distance Between</title>
        <meta name="description" content="Generated by create-t3-app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="fixed z-10 flex w-full justify-between bg-white p-3">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
        <div className="flex gap-4 text-xl uppercase">
          <h1>Distance</h1>
          <RiPinDistanceFill />
          <h1>Between</h1>
        </div>
        {!isSignedIn && (
          <div className="flex justify-center">
            <SignInButton />
          </div>
        )}
        {isSignedIn && (
          <div className="flex justify-center">
            <UserButton />
          </div>
        )}
      </div>
      <div>
        <div className="flex h-full w-full flex-col items-center gap-6 bg-slate-300 py-20">
          <div className="flex gap-4">
            <div>
              <div className="flex flex-col gap-2">
                <h1 className="py-2">First Location:</h1>
                <PlacesAutocomplete
                  setSelected={setSelected}
                  saved_locations={data2}
                />
                <div>
                  {selected && selected.description !== "" && (
                    <button
                      className="rounded-lg border border-black p-1"
                      onClick={() => setIsAddressSaved(true)}
                    >
                      Save Address
                    </button>
                  )}
                </div>
                <div>
                  {selected && isAddressSaved && (
                    <div className="flex w-20 gap-3">
                      <input
                        placeholder="Name this location..."
                        className="grow rounded-lg border border-black bg-transparent outline-none"
                        type="text"
                        value={friendname}
                        onChange={(e) => setFriendName(e.target.value)}
                      />
                      <button
                        className="rounded-lg border border-black p-1"
                        onClick={() => {
                          create({
                            content: {
                              name: friendname,
                              description: selected.description,
                              main_text: selected.main_text,
                              secondary_text: selected.secondary_text,
                              lat: selected.lat,
                              lng: selected.lng,
                            },
                          });
                          setIsAddressSaved(false);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="">
                <h1 className="py-4">Second Location</h1>
                <PlacesAutocomplete
                  setSelected={setSelected2}
                  saved_locations={data2}
                />
                <div className="flex flex-col gap-2">
                  <div className="">
                    {selected2 && (
                      <button
                        className="rounded-lg border border-black p-1"
                        onClick={() => setIsAddressSaved(true)}
                      >
                        Save Address
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex gap-2">
                      {selected2 && isAddressSaved && (
                        <div className="flex w-20 gap-3">
                          <input
                            placeholder="Name this location..."
                            className="grow rounded-lg border border-black bg-transparent outline-none"
                            type="text"
                            value={friendname}
                            onChange={(e) => setFriendName(e.target.value)}
                          />
                          <button
                            className="rounded-lg border border-black p-1"
                            onClick={() => {
                              create({
                                content: {
                                  name: friendname,
                                  description: selected2.description,
                                  main_text: selected2.main_text,
                                  secondary_text: selected2.secondary_text,
                                  lat: selected2.lat,
                                  lng: selected2.lng,
                                },
                              });
                              setIsAddressSaved(false);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 flex justify-center gap-2">
                <button
                  className=" rounded-lg border border-black p-1"
                  onClick={calculateRoute}
                >
                  Get Directions
                </button>
                <button
                  className="rounded-lg border border-black p-1"
                  onClick={clearRoute}
                >
                  Clear Directions
                </button>
              </div>
            </div>
            <GoogleMap
              zoom={!selected ? 10 : 10}
              center={centercoords}
              mapContainerClassName="map-container"
              onLoad={(map) => setMap(map)}
            >
              {selected && <MarkerF position={selected} />}
              {selected && selected2 && <MarkerF position={centercoords} />}
              {array !== null &&
                array.map((value, index) => {
                  return <MarkerF position={value} key={index} />;
                })}

              {directionsResponse && (
                <DirectionsRenderer
                  directions={directionsResponse}
                  onLoad={() => console.log("loaded")}
                  options={{ suppressMarkers: true }}
                />
              )}
            </GoogleMap>
          </div>

          {saved_locations && <FriendsList saved_locations={data2} />}
          <div className="">
            <button
              className="rounded-lg border border-black p-1"
              onClick={fetchData}
            >
              Find things to do!
            </button>
          </div>
          <div>Things to do around the middle point:</div>
          <div className="flex flex-col">
            <div className="font-serif">
              {response == "loading" && <h1>Loading...</h1>}
              {response == "loaded" &&
                items.map((numberedItem: string, index: number) => (
                  <h1 className="p-2" key={index}>
                    {index + 1}
                    {"."} {numberedItem}
                  </h1>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const PlacesAutocomplete: React.FC<PlacesAutocompleteProps> = ({
  setSelected,
  saved_locations,
}) => {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete();

  const handleSelect = async (
    description: string,
    main_text: string,
    secondary_text: string
  ) => {
    setValue(description, false);
    clearSuggestions();

    const results = await getGeocode({ address: description });
    const { lat, lng } = getLatLng(results[0]!);
    setSelected({
      description: description,
      main_text: main_text,
      secondary_text: secondary_text,
      lat,
      lng,
    });
  };
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<readonly PlaceType[]>([]);
  const [totalData, setTotalData] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const manipulatedata = function () {
    if (saved_locations) {
      const uniqueArray: google.maps.places.AutocompletePrediction[] = [];
      const results = saved_locations?.map((saved_location, index) => {
        return {
          description: saved_locations![index]!.description,
          structured_formatting: {
            main_text: saved_locations![index]!.name,
            secondary_text: saved_locations![index]!.main_text,
            main_text_matched_substrings: [{ length: 1, offset: 0 }],
          },
          matched_substrings: [{ length: 0, offset: 0 }],
          terms: [],
          types: [],
          place_id: saved_locations![index]!.id,
        };
      });

      results.forEach((item, index) => {
        if (!totalData.includes(item)) {
          uniqueArray.unshift(results![index]!);
        }
      });

      setTotalData([...data, ...uniqueArray]);
      console.log(totalData);
    }
    if (!saved_locations) {
      setTotalData([...data]);
    }
  };
  useEffect(() => {
    manipulatedata();
  }, [data, saved_locations]);

  return (
    <Autocomplete
      id="google-map-demo"
      sx={{ width: 300 }}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : option.description
      }
      filterOptions={(x) => x}
      options={totalData}
      autoComplete
      includeInputInList
      value={options[0]}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
        setValue(newInputValue);

        manipulatedata();
      }}
      onChange={(event, newValue) => {
        setOptions(newValue ? [newValue, ...options] : options);
        if (newValue !== null) {
          handleSelect(
            newValue!.description,
            newValue!.structured_formatting.main_text,
            newValue!.structured_formatting.secondary_text
          );
        }
      }}
      renderInput={(params) => (
        <TextField label="Enter an address..." {...params} fullWidth />
      )}
      renderOption={(props, option) => {
        const matches =
          option.structured_formatting.main_text_matched_substrings || [];

        const parts = parse(
          option.structured_formatting.main_text,
          matches.map((match: { offset: number; length: number }) => [
            match.offset,
            match.offset + match.length,
          ])
        );

        return (
          <li {...props}>
            <Grid container alignItems="center">
              <Grid
                item
                sx={{ width: "calc(100% - 44px)", wordWrap: "break-word" }}
              >
                {parts.map((part, index) => (
                  <Box key={index} component="span">
                    {part.text}
                  </Box>
                ))}
                <Typography variant="body2" color="text.secondary">
                  {option.structured_formatting.secondary_text}
                </Typography>
              </Grid>
            </Grid>
          </li>
        );
      }}
    />
  );
};

export default Home;