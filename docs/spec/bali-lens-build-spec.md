# BALI LENS

               AI-Powered Bali Tourism Experience Platform
                                      Experience Bali. Respect Bali.

                       PURPOSE                                Dokumen ini adalah single-source product
                                                              specification untuk AI app builder dan tim
                                                              engineering. Isinya mendefinisikan produk, UX, user
                                                              flow, data model, business rules, AI behavior,
                                                              marketplace, booking, payment, mobility, dan
                                                              guardrail budaya.

Document type: Product Requirements Document (PRD) + Technical Product
Blueprint + AI Build Prompt Language: Bahasa Indonesia with English UI
labels where useful

## 1. Executive Summary

BALI LENS adalah aplikasi mobile dan platform digital yang menghubungkan
traveller dengan destinasi, event, experience, hotel/villa, restaurant,
local guide, driver, transport, rental kendaraan, tiket, dan paket
wisata Bali dalam satu ekosistem. AI bertindak sebagai travel concierge
dan journey optimizer, bukan hanya chatbot. Prinsip produk: traveller
bebas memilih karakter perjalanan; AI menyusun pengalaman yang relevan;
platform mengoptimalkan waktu, biaya, kenyamanan, dan safety; sedangkan
cultural rules dan community governance menjadi guardrail wajib.

                              CORE IDEA                              Traveller memilih "bagaimana saya ingin mengalami
                                                                     Bali" melalui slider preference. AI kemudian
                                                                     mengubah preference itu menjadi dynamic
                                                                     itinerary, rekomendasi vendor, route, booking
                                                                     basket, dan on-trip assistance.

## 2. Product Vision

Menjadi digital experience layer untuk pariwisata Bali: satu platform
yang membuat supply lokal dapat ditemukan dan dibeli dengan mudah,
sambil menjaga kualitas perjalanan, distribusi manfaat ekonomi, dan
penghormatan terhadap adat, tradisi, serta ruang sakral.

                      Layer                                 Fungsi utama                                      Output

    Traveller Experience                       Preference, discovery, itinerary, map,      Personalized Bali Journey
                                               booking

    AI Concierge                               Recommendation, planning, matching,         Best-fit journey
                                               route optimization

    Commerce                                   Inventory, availability, cart, checkout,    One-cart multi-vendor booking
                                               payment

    Mobility                                   Driver, guide, rental, transfer, route      Connected movement

    Community & Culture                        Verified rules, local experiences,          Responsible travel
                                               destination controls

    Vendor Platform                            Inventory, calendar, booking,               Digital supply distribution
                                               settlement

    Destination Platform                       Capacity, events, cultural guidance,        Destination governance
                                               local ecosystem

## 3. Product Objectives

 Create a single digital entry point for Bali travel planning and
purchasing.  Convert traveller preferences into a personalized,
editable itinerary.  Connect fragmented tourism supply into one
interoperable inventory layer.  Enable one-cart booking and
multi-vendor payment/settlement.

 Optimize routes for time, cost, comfort, safety, and lower unnecessary
movement.  Make local guides, drivers, community experiences, and
events discoverable and bookable.  Encode cultural respect as a product
rule, not merely a content disclaimer.  Give vendors and destinations
operational dashboards.

## 4. Target Users & Roles

                         Role                                   Need                                  Key capabilities

    Traveller                                  Find and organize a trip matching          Preference slider, AI planner, booking,
                                               personal interests                         map, wallet

    Vendor                                     Sell inventory and manage operations       Inventory, calendar, pricing, booking,
                                                                                          payout

    Local Guide                                Receive matched bookings                   Profile, language, specialty, availability,
                                                                                          chat

    Driver / Transport                         Manage vehicle/service availability        Vehicle, schedule, route, booking

    Community / Destination                    Protect local capacity and cultural        Rules, capacity, approved experiences,
                                               rules                                      blackout periods

    Event Organizer                            Sell tickets and connect surrounding       Event CMS, ticketing, program, venue,
                                               tourism                                    partner offers

    Admin / Platform Ops                       Control quality and ecosystem              Verification, disputes, commissions,
                                                                                          content, analytics

## 5. Core UX: Experience Preference Onboarding

First-run experience harus dimulai dari preference, bukan katalog.
Traveller menjawab beberapa slider dan choices yang menjadi input AI
profile.

                  Preference                                  UI control                              Example values

    Spiritual                                  Slider 0-100                               Temple, reflection, rituals,
                                                                                          contemplative experiences

    Culture & Tradition                        Slider 0-100                               Heritage, village, art, dance, local
                                                                                          storytelling

    Wellbeing                                  Slider 0-100                               Yoga, spa, wellness, nature reset

    Nature & Adventure                         Slider 0-100                               Hiking, diving, cycling, waterfalls

    Culinary                                   Slider 0-100                               Local food, cooking, dining

    Arts & Creativity                          Slider 0-100                               Craft, photography, design,
                                                                                          performance

    Beach & Leisure                            Slider 0-100                               Sunrise, beach, pool, slow days

    Nightlife & Social                         Slider 0-100                               Music, bars, social events

    Authentic Local <-> Luxury                 Slider                                     Local / balanced / premium

    Slow <-> Packed                            Slider                                     Slow / balanced / packed

              Preference                                 UI control                              Example values

Budget \<-\> Premium Slider Budget / balanced / premium

System output example: "Your Bali Profile: 82% Culture, 74% Spiritual,
68% Wellbeing, 41% Adventure; Slow Travel; Mid-High Budget." The profile
must be editable at any time.

## 6. Information Architecture / Mobile Navigation

                 Tab                                      Purpose                               Primary screens

Home AI-led trip control center Today, Journey, AI suggestions, alerts

Explore Discover Bali ecosystem Destinations, Experiences, Events, Food,
Wellness

Journey Manage the trip Timeline, bookings, passes, changes, chat

Map See geography and routes Pins, route options, nearby, traffic/status

Profile Identity and preferences Traveller profile, preferences, wallet,
loyalty, settings

## 7. Key Mobile Screens

                  ID                                        Screen                           Required components

S01 Splash / Welcome Logo, tagline, language, sign-in/guest

S02 Experience Onboarding Preference sliders, trip duration, budget,
travel party

S03 AI Profile Generated preference profile, edit controls

S04 Home Current journey, next activity, AI recommendations, alerts

S05 Explore Search, category chips, map/list toggle

S06 Experience Detail Media, description, cultural notes, price,
availability, reviews

S07 Destination Detail Highlights, etiquette, crowd/capacity, nearby
experiences

S08 Event Detail Program, tickets, venue, transport, nearby services

S09 AI Journey Builder Prompt + suggestions + editable day plan

S10 Route Compare Cheapest / Fastest / Comfortable / Sustainable

                    ID                                     Screen                             Required components

S11 Booking Cart Multi-vendor items, date/time, participants, policies

S12 Checkout & Payment Billing, payment method, voucher, confirmation

S13 My Journey Timeline, QR tickets, driver/guide details, changes

S14 Guide/Driver Profile Identity, verification, language, specialty,
vehicle

S15 Chat / Trip Support AI + vendor/guide communication

S16 Map Live Journey Current location, pickup, route, ETA, safe-route
status

S17 Rental Vehicle search, document requirements, deposit, pickup/return

S18 Wallet / Loyalty Transactions, points, credits, refunds

S19 Cultural Code Contextual etiquette and restrictions

S20 Post-Trip Review, impact summary, saved preferences, rebook

## 8. AI Concierge - Functional Specification

AI harus menjadi orchestrator di atas structured inventory. LLM tidak
boleh menjadi source of truth untuk harga, availability, booking status,
cultural restrictions, atau operational facts. AI harus memanggil
tools/API yang relevan dan menyatakan ketidakpastian bila data tidak
tersedia.

           AI module                     Input                            Output                             Rule

Preference AI Slider + profile + trip Traveller profile Persist as
structured JSON constraints

Journey AI Profile + inventory + dates Day-by-day itinerary All bookable
items must link to inventory IDs

Matching AI Traveller profile + vendor Ranked vendor matches Do not rank
solely by attributes commission

Route AI Places + opening hours + Route options Always expose
assumptions transport + price

Cultural Guardian Destination/community Contextual guardrails Never
invent cultural rules rules + experience metadata

On-trip AI Live journey + booking data Replanning/support Protect
confirmed bookings unless user approves changes

## 9. AI Recommendation & Ranking Logic

Suggested ranking score (tunable, not hard-coded in UI): relevance 25%,
availability 15%, quality 15%, cultural compatibility 15%,
authenticity/community value 10%, safety/operational suitability 10%,
price fit 5%, distance/travel friction 5%. Commission must not be a
direct ranking factor. The system must support explicit recommendation
explanations: "Recommended because you selected Culture 90%, you are
staying in Ubud, and this experience is available at 15:00."

## 10. Dynamic Itinerary Rules

 No impossible overlaps: account for experience duration, transfer
time, buffer, and opening hours.  Cluster geographically related
activities to reduce backtracking.  Prefer fewer vehicle changes when
comfort is prioritized.  Use traveller pace setting to control daily
activity density.  Protect meal, rest, and transition periods for long
journeys.  When cultural sites have access limitations, treat those
restrictions as hard constraints.  When an item is unavailable, propose
alternatives rather than silently replacing a booked item.  Allow
manual lock/pin of activities so AI will not change them without
permission.

## 11. Route AI

                     Mode                           Optimization target                            Required display

    Cheapest                               Minimize estimated spend                     Total cost, savings, trade-offs

    Fastest                                Minimize travel time                         ETA, transfer count

    Comfortable                            Minimize transfers / friction                Transfer count, vehicle type

    Sustainable                            Reduce unnecessary movement /                Distance, vehicle mode, rationale
                                           lower-impact options when data exists

    Safe / Operational                     Prefer verified operational options and      Risk/constraint explanation, timestamp
                                           appropriate timing

Safety language must avoid false certainty. Use "recommended based on
available operational data" rather than a guarantee of safety.

## 12. Marketplace & Inventory Model

Each bookable object needs a stable ID and normalized attributes so that
AI, search, booking, analytics, and vendor settlement can work on the
same objects.

                            Entity                                                       Minimum fields

    Destination                                                   id, name, geo, category, description, hours, capacity,
                                                                  cultural_rules[], media[]

    Experience                                                    id, vendor_id, destination_ids[], category[], duration,
                                                                  capacity, price, availability, language[], impact_tags[]

                            Entity                                                     Minimum fields

    Event                                                       id, organizer_id, venue, dates, program, ticket_types[],
                                                                capacity, status

    Vendor                                                      id, legal/business profile, verification_status, service_types[],
                                                                service_area, rating

    Guide                                                       id, vendor/user_id, languages[], specialties[],
                                                                certification/verification, availability, rate

    DriverService                                               id, operator_id, vehicle_id, service_type, availability,
                                                                rate_model

    Vehicle                                                     id, category, seat_count, transmission, rental_terms,
                                                                availability

    Booking                                                     id, traveller_id, supplier_id, item_type, schedule,
                                                                participants, amount, status, refund_policy

    Payment                                                     id, booking_id/cart_id, provider, currency, gross, fees,
                                                                settlement, status

    CulturalRule                                                id, scope_type, scope_id, rule_text, severity, valid_from,
                                                                valid_to, source_owner, version

## 13. One-Cart Multi-Vendor Booking

 Traveller can add hotel, experience, event ticket, guide, driver,
transfer, and rental into one cart.  Checkout generates a platform
order plus child supplier bookings.  Each child booking keeps its own
cancellation/refund policy.  Payment layer records gross amount,
platform fee, payment processing fee, vendor payable, taxes/charges when
applicable.  Settlement status is tracked separately from traveller
booking status.  Partial cancellation must be supported at line-item
level.

## 14. Payment & Financial Flow

Use a payment orchestration layer with a PSP abstraction so the platform
can change providers without rewriting commerce logic. Support local and
international payment methods appropriate to the target market, subject
to provider and regulatory availability.

                            Object                                                           Statuses

    Cart                                                        active, expired, converted

    Payment                                                     pending, authorized, paid, failed, refunded,
                                                                partially_refunded

    Booking                                                     pending, confirmed, cancelled, completed, no_show

    Settlement                                                  pending, eligible, paid, held, reversed

    Refund                                                      requested, approved, processed, failed

## 15. Guide / Driver / Mobility Connectivity

Guide dan driver tidak boleh menjadi kontak informal di luar platform
sebelum booking. Setelah booking, user dapat melihat profile
terverifikasi, chat, pickup point, schedule, dan status service.  Guide
matching berdasarkan bahasa, specialty, area, availability, quality, and
preference fit.  Driver matching berdasarkan vehicle class, capacity,
route, availability, service rating, and price fit.  Live journey
screen dapat menampilkan pickup, ETA, booked vehicle/service, dan
support.  Car/motorbike rental memiliki workflow pickup, condition
checklist, deposit, return, damage report, and dispute handling.

## 16. Cultural Guardian & Responsible Bali Rules

                         NON-NEGOTIABLE                           Cultural restrictions and community rules must
                                                                  come from a verified source owner
                                                                  (destination/community/operator/admin), be
                                                                  versioned, and be treated as structured constraints.
                                                                  AI is not allowed to invent, generalize, or override
                                                                  them.

 Contextual etiquette appears before relevant booking or navigation
step.  Restricted/sacred zones can have hard access rules. 
Photography or behavioral restrictions must be displayed when verified.
 Community capacity and blackout dates can make an experience
unavailable.  AI should recommend alternatives when an experience is
constrained, without encouraging circumvention.  Vendor content can be
flagged for cultural review where required.  Platform should preserve
attribution/source for community-owned rules and descriptions.

## 17. Community & Destination Control Panel

                             Module                                                       Capabilities

    Capacity                                                     Set visitor capacity or availability windows

    Rules                                                        Create/update cultural rules, effective dates, severity

    Approved Experiences                                         Approve local experience categories or vendors

    Events                                                       Publish event schedule/program/status

    Local Economy                                                Highlight community vendors and local supply

    Operational Alerts                                           Close/limit/restrict access and update operational notes

    Analytics                                                    Visits, bookings, origin, spend, congestion indicators where
                                                                 available

## 18. Vendor Portal

                           Area                                                         Features

    Dashboard                                                 Bookings today, revenue, capacity, alerts

    Inventory                                                 Create/edit experience, ticket, transport, rental products

    Calendar                                                  Availability, blackouts, capacity

    Pricing                                                   Price rules, packages, promo codes

    Booking Ops                                               Confirm, reschedule, cancel, no-show

    Customer                                                  Traveller details limited to operational needs

    Finance                                                   Earnings, fees, settlements, invoices

    Quality                                                   Reviews, complaints, verification status

## 19. Event Integration

Events are first-class inventory. Each event can connect to surrounding
hotels, restaurants, transport, guides, experiences, and destination
information. Event-to-itinerary behavior: when a traveller saves or buys
an event, the AI may propose pre-event and post-event activities, but
must respect travel time and ticket timing. Venue capacity or event
status changes must propagate to itinerary recommendations.

## 20. Search & Discovery

Search must support keyword, location, category, date/time, price,
language, availability, and preference-fit filters. Semantic search can
enrich discovery, but final bookability must come from structured
inventory. Recommended cards should explain fit and show the minimum
critical information: location, duration, starting price, availability,
category, language if relevant, verification, and cultural notes when
applicable.

## 21. Reviews & Trust

 Only verified purchasers can submit booking-linked reviews.  Reviews
should be item-specific (experience/vendor/guide/driver) rather than
indiscriminate.  Quality score should be robust against small-sample
inflation.  Fraud/spam detection should be available at platform level.
 Vendors can respond, but cannot remove legitimate reviews.

## 22. Notifications

                      Trigger                                                        Example

Booking Booking confirmed; payment failed; cancellation

Journey Pickup reminder; schedule change; route suggestion

Culture Etiquette reminder before relevant site

Operations Experience temporarily unavailable; event update

AI New recommendation based on changed weather/opening/availability data
when such feeds exist

Payment Refund processed; settlement not user-facing

## 23. Core API / Service Architecture

Recommended service boundaries: Auth & Identity, Profile, Catalog,
Search, Inventory, Availability, Booking, Cart, Payment, Settlement,
Mobility, Guide, Event, Destination, Cultural Rules, AI Orchestrator,
Notifications, Reviews, Analytics. Use API-first design. All entities
must have immutable IDs. Every mutation requires audit metadata: actor,
timestamp, source, previous state, new state where relevant.

## 24. AI Tool Contracts

             Tool                    Purpose                     Minimum input                   Minimum output

search_inventory Find candidate supply filters, dates, geo, preference
item IDs + availability vector

get_item Fetch source of truth item_id normalized item

check_availability Verify bookability item_id, slot, quantity
available/unavailable

create_booking Reserve inventory cart/line items booking IDs/status

calculate_route Compare movement options origin, destinations, route
options + assumptions constraints

get_cultural_rules Fetch verified rules scope ID + timestamp rules +
source/version

match_guide Rank guides preference + date + language ranked guide IDs

match_driver Rank drivers vehicle + route + date ranked service IDs

get_payment_options Payment methods currency, user/market available
methods

create_payment Start payment order_id + method payment intent/status

## 25. Data Privacy & Security

 Collect minimum personal data required to operate the service.  Do
not expose guide/driver personal contact details before a legitimate
booking need.  Use role-based access control for vendor/community/admin
portals.  Encrypt sensitive data in transit and at rest where
applicable.  Log access to operationally sensitive traveller/vendor
information.  Separate payment credentials from the core application;
use tokenized PSP flows.  Provide account deletion/export processes
consistent with applicable law and platform policy.

## 26. Non-Functional Requirements

                           Area                                                       Requirement

    Performance                                               Home/search interaction should feel near-real-time; use
                                                              caching for stable catalog data.

    Reliability                                               Booking creation must be idempotent; payment callbacks
                                                              must be safely replayable.

    Observability                                             Structured logs, metrics, traces, booking/payment audit
                                                              events.

    Scalability                                               Inventory/search and AI orchestration should scale
                                                              independently.

    Localization                                              Bahasa Indonesia + English at launch; architecture must
                                                              support additional languages.

    Accessibility                                             Readable text, sufficient contrast, scalable font, semantic
                                                              controls, screen-reader labels where supported.

    Offline resilience                                        Saved itinerary, ticket references, and essential trip details
                                                              should remain accessible with limited connectivity.

## 27. Analytics & KPIs

                          Funnel                                                           KPIs

    Activation                                                Onboarding completion, AI profile completion

    Discovery                                                 Search-to-detail CTR, save-to-journey rate

    Planning                                                  AI itinerary acceptance, edit rate, lock rate

    Commerce                                                  Cart conversion, booking conversion, AOV, cancellation rate

    Mobility                                                  Guide/driver match success, pickup success, route
                                                              acceptance

    Ecosystem                                                 Active vendors, inventory freshness, supplier concentration

    Responsibility                                            Local/community booking share, cultural rule
                                                              acknowledgement, issue rate

    Retention                                                 Repeat trip planning, saved preferences, 90-day return

## 28. MVP Scope

MVP must prioritize a coherent end-to-end journey rather than maximum
catalog size.  Account/guest profile + Experience Preference
onboarding.  Explore: destination, experience, event, guide, driver. 
AI Journey Builder with editable day plan.  Route comparison: cheapest,
fastest, comfortable, sustainable/operational where data exists. 
Availability + one-cart checkout + payment abstraction.  Booking
confirmation + QR/ticket/pass where required.  Guide/driver matching
and post-booking chat.  Cultural Guardian based on verified rules
dataset.  Basic vendor dashboard and admin content management.

## 29. Phase 2

 Car rental and motorbike rental workflows with inspection/deposit
handling.  Community marketplace and destination control panel.  Event
ecosystem packages.  Loyalty and Bali Experience Points.  More payment
methods and cross-border settlement capabilities.  Real-time
operational feeds and richer route optimization.

## 30. Phase 3

 Voice AI concierge.  Multilingual expansion.  B2B API for hotels,
travel agents, and destination partners.  Bali Experience Pass /
ecosystem membership.  Predictive demand and capacity tools for
vendors/destinations.

## 31. Example Traveller Journey

Scenario: Traveller stays 5 nights, selects Culture 90, Spiritual 75,
Wellbeing 70, Adventure 35, Slow Travel, Mid-High Budget.

                            Step                                                     System behavior

    1. Onboarding                                              Create preference vector and constraints.

    2. AI plan                                                 Generate 5-day journey clustered by geography and pace.

    3. Discovery                                               Show recommended experiences, events, guide, driver.

    4. Route compare                                           Offer cost/time/comfort alternatives.

    5. Cart                                                    Add hotel, guide, driver, experiences, event ticket.

                           Step                                                     System behavior

6.  Checkout One payment flow; create parent order + supplier bookings.

7.  Pre-trip Send schedule, cultural context, tickets, contacts.

8.  On-trip Provide map, pickup details, AI support, and approved
    replanning.

9.  Post-trip Collect verified reviews and impact summary; save
    preferences.

## 32. Example Data Objects

Illustrative JSON shapes. AI builder should implement typed schemas, not
free-form text storage. { "traveller_profile": { "culture": 0.90,
"spiritual": 0.75, "wellbeing": 0.70, "adventure": 0.35, "pace": "slow",
"budget": "mid_high" } } { "experience": { "id": "EXP-001", "vendor_id":
"VEN-101", "categories": \["culture", "craft"\], "duration_min": 180,
"price": {"amount": 450000, "currency": "IDR"}, "availability":
"inventory_service", "cultural_rule_ids": \["CR-009"\] } } {
"booking_order": { "id": "ORD-2026-0001", "lines":
\[{"item_id":"EXP-001","supplier_id":"VEN-101"}\], "payment_status":
"paid", "settlement_status": "pending" } }

## 33. Acceptance Criteria for AI App Builder

                           Area                                                        Done when

Navigation All five primary tabs exist and route correctly.

Onboarding Slider preferences persist and generate a structured profile.

AI AI can create, explain, edit, and re-plan itineraries using inventory
tools.

Catalog Destination/experience/event/vendor pages use structured data.

Booking At least one multi-vendor order can be created end-to-end in
test environment.

                        Area                                                        Done when

Payment Payment state transitions are modeled and idempotent.

Mobility Guide/driver can be matched and displayed in a confirmed
booking.

Map Route options display with cost/time assumptions.

Culture Verified cultural rules can block or modify a recommendation.

Vendor Vendor can create inventory and manage bookings in portal.

Admin Admin can approve content and maintain cultural rules.

QA Critical user flows have automated tests and production monitoring
hooks.

## 34. Master Prompt for AI App Builder

Copy/paste the following prompt into an AI application builder. Treat
the requirements above as the source of truth. Build a production-ready
mobile-first tourism platform named BALI LENS.

PRODUCT: BALI LENS is an AI-powered Bali Tourism Experience Platform. It
connects travellers with destinations, events, experiences,
hotels/villas, restaurants, local guides, drivers, transport, vehicle
rentals, tickets and dynamic packages. The core UX is preference-driven:
travellers adjust sliders for Spiritual, Culture & Tradition, Wellbeing,
Nature & Adventure, Culinary, Arts & Creativity, Beach & Leisure,
Nightlife & Social, Authentic Local \<-\> Luxury, Slow \<-\> Packed and
Budget \<-\> Premium. Persist this as a structured traveller preference
vector.

AI: Implement an AI Concierge that can search structured inventory,
retrieve item details, check availability, compare routes, match
guides/drivers, fetch verified cultural rules, create bookings, and
start payments through explicit tools/APIs. The AI must never invent
prices, availability, booking status, opening hours, or cultural
restrictions. The AI should explain why recommendations fit the
traveller. Do not rank products purely by commission.

UX: Create tabs Home, Explore, Journey, Map and Profile. Required
screens include onboarding, AI profile, home, explore, destination
detail, experience detail, event detail, AI journey builder, route
compare, cart, checkout, payment, my journey, guide/driver profile,
chat, live journey map, rental, wallet/loyalty, cultural code, and
post-trip.

PLANNING: Generate dynamic day-by-day itineraries using duration,
opening hours, availability, geography, travel time, pace, budget, and
cultural constraints. Support Cheapest, Fastest, Comfortable and
Sustainable/Operational route modes. Let users lock activities so AI
cannot change them without permission.

COMMERCE: Implement one-cart multi-vendor booking. A platform order
contains child supplier bookings. Each line item retains its own
cancellation/refund policy. Support booking, payment, refund, partial
cancellation, settlement states and idempotency. Use a payment provider
abstraction.

MOBILITY: Connect local guides, drivers, airport transfers, car rental
and motorbike rental. Guide/driver matching must consider language,
specialty, area, availability, quality, capacity and traveller
preference. After booking, expose operational contact/chat, pickup, ETA
and service status.

CULTURE: Treat Bali cultural protection as a first-class product rule.
Cultural rules must be structured, verified, versioned and owned by a
destination/community/operator/admin source. The system can block, limit
or modify recommendations based on these rules. Never encourage
circumvention of restrictions. Show contextual etiquette before relevant
actions.

MARKETPLACE: Build vendor portal for inventory, calendar, pricing,
bookings, customer operations, finance and quality. Build
destination/community control panel for capacity, cultural rules,
approved experiences, events and operational alerts.

DATA: Use typed entities with immutable IDs: TravellerProfile,
Destination, Experience, Event, Vendor, Guide, DriverService, Vehicle,
Booking, Cart, Payment, Settlement, CulturalRule, Review, RouteOption,
Notification.

QUALITY: Responsive mobile UI, clean tourism visual language inspired by
Bali without stereotyping sacred symbols. Provide Bahasa Indonesia and
English. Include error states, loading states, empty states, validation,
audit logs, observability hooks, accessibility and offline access to
essential trip details.

SECURITY: Apply RBAC, data minimization, secure payment tokenization,
access logging and separation of payment data.

MVP: Deliver onboarding -\> AI profile -\> explore -\> AI itinerary -\>
route comparison -\> cart -\> payment -\> booking confirmation -\>
guide/driver match -\> journey map -\> cultural guardian -\>
vendor/admin basics as one coherent end-to-end demo flow.

Generate the database schema, API contracts, screen map, reusable UI
components, seed data for Bali, sample cultural-rule records, AI tool
contracts, booking state machine, payment state machine, and test cases.
Use realistic sample data but clearly mark it as demo data.

## 35. Recommended Initial Technical Stack

                       Layer                                                     Recommendation

Mobile React Native / Expo or Flutter

Web Admin/Vendor Next.js / React

Backend TypeScript/NestJS or equivalent typed service framework

Database PostgreSQL

Search OpenSearch/Elasticsearch or managed equivalent

Maps / Routing Provider abstraction around mapping/routing APIs

Payments PSP abstraction with tokenized methods

AI LLM orchestration service + tool calling + retrieval over structured
data

Storage Object storage + CDN for media

Queue Managed queue/event bus for booking/payment/inventory events

Observability Logs + metrics + traces + alerting

## 36. Product Design Direction

Visual direction: premium but approachable, inspired by Bali through
landscape, ocean, earth, craft, and contemporary tropical hospitality -
not by overusing sacred or ceremonial iconography. Use sea/ocean blue as
the primary brand family, teal for actions, warm earth/gold as accent,
strong whitespace, rounded cards, large imagery, and map-led discovery.

Tone: confident, warm, locally respectful, useful. Avoid claims such as
"guaranteed safe" or "authentic" unless supported by an explicit
verification model.

## 37. Implementation Principle

                     NORTH STAR                                Optimize the journey, not just the transaction. The
                                                               platform should make Bali easier to experience
                                                               while preserving the authority of local communities
                                                               over their culture, rules, capacity, and meaning.

End of specification. Treat this document as the baseline product
contract. Changes should be versioned and reviewed against the core
principles: traveller relevance, operational accuracy, responsible
tourism, community respect, and commercial transparency.
