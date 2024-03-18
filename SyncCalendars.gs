//!!!!!!!!!!!!!!!!!!!!!!!!!!!
//Prerequisites:
//1. On the account on which the script is running a subscription to the other account has to be set
//2. The account on which the script is running has to have "Make changes to events permission" for the other calendar
//!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Doc: https://developers.google.com/apps-script/reference/calendar

const acCalendarId = '<<AscentCore Calendar ID>>';
const rvCalendarId = '<<Rover Calendar ID>>';
const daysToConsider = 14;
const syncedEventColor = CalendarApp.EventColor.BLUE;
const tagName = "MyEventKey";

function syncFunction() {
  const acCalendar = CalendarApp.getCalendarById(acCalendarId);
  const rvCalendar = CalendarApp.getCalendarById(rvCalendarId);
  const startPeriod = new Date();
  var endPeriod = new Date();
  endPeriod.setDate(startPeriod.getDate() + daysToConsider);
  sync(acCalendar, rvCalendar, 'busy', null, startPeriod, endPeriod);
  sync(rvCalendar, acCalendar, null, '[Rover]', startPeriod, endPeriod);
}

function sync(sourceCalendar, destinationCalendar, defaultTitle, preTitle, startPeriod, endPeriod){
  const sourceEvents = sourceCalendar.getEvents(startPeriod, endPeriod);
  for (const sourceEvent of sourceEvents) {
    if (sourceEvent.getTag(tagName) == null){
      //it is an event created in the source calendar, not created by this script
      const destinationEvents = destinationCalendar.getEvents(sourceEvent.getStartTime(), sourceEvent.getEndTime());
      const foundEvent = getEvent(destinationEvents, sourceEvent);
      if (foundEvent == null){
        //event does not exist in the destination calendar => create it
        const title = createTitle(destinationCalendar, defaultTitle, preTitle, sourceEvent);
        createEvent(destinationCalendar, title, sourceEvent)
      }
      else{
        //event exists in the destination calendar => see if it was changed
        const title = createTitle(destinationCalendar, defaultTitle, preTitle, sourceEvent);
        if (foundEvent.getTitle() != title)
          foundEvent.setTitle(title);
      }
    }
    else{
      //it is an event created by this script (synced)
      const destinationEvents = destinationCalendar.getEvents(sourceEvent.getStartTime(), sourceEvent.getEndTime());
      const foundEvent = getEvent(destinationEvents, sourceEvent);
      if (foundEvent == null){
        //event does not exist anymore => delete it
        sourceEvent.deleteEvent();
      }
    }
    Utilities.sleep(100);    
  }
}

function createEvent(calendar, title, sourceEvent){
  var event;
  if (sourceEvent.isAllDayEvent())
    event = calendar.createAllDayEvent(title, sourceEvent.getAllDayStartDate());
  else
    event = calendar.createEvent(title, sourceEvent.getStartTime(), sourceEvent.getEndTime());     
  event.setTag(tagName, sourceEvent.getId());
  event.setColor(syncedEventColor);
}

function createTitle(calendar, defaultTitle, preTitle, sourceEvent){
  var title = '';
  if (preTitle != null) title = preTitle;
  if (calendar.getId() == rvCalendarId){
    title += " --" + sourceEvent.getMyStatus().toString() + "--";
  }
  else {
    const guest = sourceEvent.getGuestByEmail(rvCalendarId);
    if (guest != null){
      title += " --" + guest.getGuestStatus().toString() + "--";
    }
    else {
      //for whatever reason the creator is not always returned in the guests list, in this case search it in the creators
      const creators = sourceEvent.getCreators();
      for (const creator of creators) {
        if (creator == rvCalendarId){
          title += " -- OWNER --";
          break;
        }
      }
    }
  }
  if (defaultTitle != null)
    title += " " + defaultTitle;
  else
    title += " " + sourceEvent.getTitle();
  return title;
}

function getEvent(events, event){
  var foundEvent = null;
  if (events != null){
    for (const currentEvent of events) {
      if (!event.isAllDayEvent()){
        if ((currentEvent.getTag(tagName) == event.getId() || currentEvent.getId() == event.getTag(tagName)) 
        && currentEvent.getStartTime().toString() == event.getStartTime().toString()
        && currentEvent.getEndTime().toString() == event.getEndTime().toString()){
          foundEvent = currentEvent;
          break;
        }
      }
      else {
        if ((currentEvent.getTag(tagName) == event.getId() || currentEvent.getId() == event.getTag(tagName)) 
        && currentEvent.getStartTime().toString() == event.getStartTime().toString()){
          foundEvent = currentEvent;
          break;
        }
      }
    } 
  }
  return foundEvent;
}
