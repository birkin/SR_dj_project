
// This module collects all the functionality related to saving to the server

// Referents - save

async function saveReferentData_post(referentId, itemId, apiDefinition, requestBody) {

  const fetchOptions = {
          method: apiDefinition.api_method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': TOKEN
          },
          body: requestBody
        };

  console.log(`SAVE REFERENT FETCH OPTIONS - posting to ${apiDefinition.api_url}`, 
              fetchOptions);

  if (true) { // TURN OFF/ON REFERENT SAVING
    const response = await fetch(apiDefinition.api_url, fetchOptions);
    console.log('SAVE REFERENT RESPONSE', response);
    const dataJSON = await response.text();
    console.log('SAVE REFERENT RESPONSE JSON', dataJSON);
  }

  // @todo Return value??
};

function saveReferentDataToServer() {

  console.log('CALLING ROUTINE TO SUBMIT REFERENT DATA');

  if (this.currentReferent.FULL_DATA_LOADED) {

    // Convert from Tagify to DB-ready data structure

    function convertFromTagify(tagifyString) {
      return JSON.parse(tagifyString || '[]').map(
        tagData => { return { id: tagData.dbID, name: tagData.value } }
      );
    }

    // Map data in Vue to what's expected by the API

    const requestBody = JSON.stringify({
      age: this.currentReferent.age,
      names: this.currentReferent.names.map(
        name => Object.assign({}, name, { id: name.id.toString() })
      ),
      origins: this.currentReferent.origins,
      races: convertFromTagify(this.currentReferent.races),
      sex: this.currentReferent.sex,
      statuses: [], // this.currentReferent.statuses, // ??
      titles: this.currentReferent.titles.map(
        title => {
          title.name = title.label.valueOf();
          return title 
        }
      ),
      tribes: convertFromTagify(this.currentReferent.tribes),
      vocations: convertFromTagify(this.currentReferent.vocations)
    });

    console.log('SAVE CURRENT REFERENT');
    this.saveStatus = this.SAVE_STATUS.SAVE_IN_PROGRESS;

    saveReferentData_post(
      this.currentReferentId, 
      this.currentItemId,
      this.saveCurrentReferentAPI,
      requestBody
    ).then(
      () => { this.saveStatus = this.SAVE_STATUS.SUCCESS }
    );
  }
}

async function deleteReferentOnServer(referent) {
  const url = `http://127.0.0.1:8000/data/entrants/${referent.id}/`,
        fetchOptions = {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': TOKEN
          }
        };

  const response = await fetch(url, fetchOptions);

  if (response.ok) {
    // @todo - trigger data backup?
    return true;
  } else {
    throw Error(response.statusText);
  }
}

// Item: create, save, delete

async function createItemOnServer() {

  /* NOTE: THIS MAY NOT BE USEFUL
           Maybe we just need to create a new entry, it will save automatically,
           (using saveItemDatatoServer()) and then we just reload the 
           data into the local copy OR rename 'new' to whatever */

  const requestBody = {
    locations:[],
    date:'',
    transcription:'',
    record_type:{},
    national_context: 3,
    citation_id: 8, // this.formData.doc.id,
    image_url:''
  };

  const url = `http://127.0.0.1:8000/data/records/new/`,
        fetchOptions = {
          method: 'POST', // apiDefinition.api_method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': TOKEN
          },
          body: JSON.stringify(requestBody)
        };

  console.log('CREATE ITEM', fetchOptions);

  const response = await fetch(url, fetchOptions);
  if (response.ok) {
    const dataJSON = await response.json();
    // this.currentItem.relationships = dataJSON.store;
    // this.saveStatus = this.SAVE_STATUS.SUCCESS;
    console.log('RESPONSE', {response, dataJSON}) ;
  } else {
    // this.saveStatus = this.SAVE_STATUS.ERROR;
    throw Error(response.statusText);
  }
}

async function saveItemDataToServer() {

  console.log(`CALLING ROUTINE TO SUBMIT ITEM DATA - item id ${this.currentItemId}`);
  console.log(' FULL DATA LOADED? ' + this.currentItem.FULL_DATA_LOADED);

  if (this.currentItem.FULL_DATA_LOADED) {

    this.saveStatus = this.SAVE_STATUS.SAVE_IN_PROGRESS;

    const isNewItem = (this.currentItemId === 'new');

    // Only save current Item (without Referent data)

    // const { referents, ...currentItemDataNoReferents } = this.currentItem;
    // const currentItemCopy = JSON.parse(JSON.stringify(currentItemDataNoReferents));

    const locations = [],
          makeLocationObj = locationType => {
            return {
              id: this.currentItem.location_info[locationType].id || -1,
              label: this.currentItem.location_info[locationType].name,
              value: this.currentItem.location_info[locationType].name
            }
          };

    if (this.currentItem.location_info['Colony/State']) {
      locations.push(makeLocationObj('Colony/State'));
      if (this.currentItem.location_info['City']) {
        locations.push(makeLocationObj('City'));
        if (this.currentItem.location_info['Locale']) {
          locations.push(makeLocationObj('Locale'));
        }
      }
    }

    let date;

    if (this.currentItem.dateParts.year) {
      const month = this.currentItem.dateParts.month !== -1
          ? this.currentItem.dateParts.month
          : '01',
        day = this.currentItem.dateParts.day
          ? this.currentItem.dateParts.day.toString().padStart(2, '0')
          : '01',
        year = this.currentItem.dateParts.year;
      date = `${month}/${day}/${year}`;
    } else {
      date = null;
    }

    const requestBody = {
      locations,
      date,
      transcription: this.currentItem.kludge.transcription,
      record_type: {
         id: this.currentItem.kludge.reference_type_id,
         //"value":"Runaway",
         //"label":"Runaway" @todo Q: ARE THESE NECESSARY?
      },
      national_context: this.currentItem.national_context_id,
      citation_id: this.formData.doc.id,
      image_url: this.currentItem.image_url
    };

    const httpMethod = isNewItem ? 'POST' : 'PUT';

    const url = `http://127.0.0.1:8000/data/records/${this.currentItemId}/`,
          fetchOptions = {
            method: httpMethod, // 'PUT', // apiDefinition.api_method,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': TOKEN
            },
            body: JSON.stringify(requestBody)
          };

    console.log(`SAVE ITEM FETCH OPTIONS - ${httpMethod}ing to ${url}`, fetchOptions);

    if (false) { return }  // Skip send if true

    this.saveStatus = this.SAVE_STATUS.SAVE_IN_PROGRESS;
    const response = await fetch(url, fetchOptions);
    if (response.ok) {
      const dataJSON = await response.json();
      // this.currentItem.relationships = dataJSON.store;
      this.saveStatus = this.SAVE_STATUS.SUCCESS;
      console.log('RESPONSE', {response, dataJSON});

      // If this is a new item ...

      if (isNewItem) {
        const itemIdMatch = dataJSON.redirect.match('/editor/records/([^/]+)/');
        if (itemIdMatch && itemIdMatch[1]) {
          // @todo, sometime - if we go with UUIDs, then the ID will be a string
          const newItemDatabaseId = parseInt(itemIdMatch[1]);
          console.log(`NEW ITEM ID: ${newItemDatabaseId}`);

          let newItemData = JSON.parse(
            JSON.stringify(this.formData.doc.references.new)
          );
          newItemData.id = newItemDatabaseId;
          newItemData.transcription = 'BOOYAH 5';

          this.formData.doc.references.new = undefined;
          delete this.formData.doc.references.new;

          // METHOD 1 -- doesn't create a reactive item
          // this.formData.doc.references[newItemDatabaseId] = newItemData;

          // METHOD 2
          /*
          this.formData.doc.references = Object.assign(
            {}, 
            this.formData.doc.references, 
            { [newItemDatabaseId]: newItemData }
          ); */

          // METHOD 3
          this.$set(this.formData.doc.references, newItemDatabaseId, newItemData);
          //this.$set(this.formData.doc.references[newItemDatabaseId], 'transcription', 'CAT');
          // this.formData.doc.references[newItemDatabaseId].id = newItemDatabaseId;

          this.currentItemId = newItemDatabaseId;
        }
      }

    } else {
      this.saveStatus = this.SAVE_STATUS.ERROR;
      throw Error(response.statusText);
    }
  }
}

function deleteCurrentItem() {
  console.log(`DELETING ITEM ID ${this.currentItemId}`);
}

// Relationships

async function createRelationshipOnServer() {
  
  console.log(`SAVING NEW RELATIONSHIP`);
  const requestBody = {
          sbj: this.currentReferentId,
          rel: parseInt(this.newRelationship.rel),
          obj: parseInt(this.newRelationship.obj),
          section: this.currentItemId
        },
        url = `http://127.0.0.1:8000/data/relationships/`, // @todo replace with Birkin's URL
        fetchOptions = {
          method: 'POST', // apiDefinition.api_method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': TOKEN
          },
          body: JSON.stringify(requestBody)
        };
  // console.log({requestBody, url, fetchOptions});
  if (true) { // TURN OFF/ON REFERENT SAVING
    const response = await fetch(url, fetchOptions);
    console.log('SAVE REFERENT RESPONSE', response);
    const dataJSON = await response.json();
    console.log('SAVE REFERENT RESPONSE JSON', dataJSON.store);

    this.currentItem.relationships = dataJSON.store;

    // Reset new relationship form elements

    this.newRelationship.rel = null;
    this.newRelationship.obj = null;
  }
}

async function deleteRelationshipOnServer(relationship) {
  console.log(`DELETING RELATIONSHIP ID: ${relationship.id}`);
  const url = `http://127.0.0.1:8000/data/relationships/${relationship.id}`, // @todo BIRKIN - NEED URL
        requestBody = { section: this.currentItemId },
        fetchOptions = {
          method: 'DELETE', // apiDefinition.api_method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': TOKEN
          },
          body: JSON.stringify(requestBody)
        };
  
  this.saveStatus = this.SAVE_STATUS.SAVE_IN_PROGRESS;
  const response = await fetch(url, fetchOptions);

  if (response.ok) {
    const dataJSON = await response.json();
    this.currentItem.relationships = dataJSON.store;
    this.saveStatus = this.SAVE_STATUS.SUCCESS;
  } else {
    this.saveStatus = this.SAVE_STATUS.ERROR;
    throw Error(response.statusText);
  }
  
  // @todo - also delete inverse relationship?
}

// Vue Mixin

const saveFunctionsMixin = {

  computed: {

      // Computed properties that are watched to trigger saves

      watchMeToTriggerReferentSave: function () { // (may not be necessary)
        return JSON.stringify(this.currentReferent);
      },

      watchMeToTriggerItemSave: function () {
        // Ignores changes in referents
        const {referents, ...rest} = this.currentItem;
        return JSON.stringify(rest);
      }
  },

  watch: {

    // If current referent info changes, save
    //  (but only if full referent data has been previously loaded)

    currentReferent: {
      handler: saveReferentDataToServer,
      deep: true
    },

    // If the Item data changes (as defined by computed field)
    //  then save

    watchMeToTriggerItemSave: {
      handler: saveItemDataToServer
    }
  },

  methods: {
    deleteReferentOnServer,
    createRelationshipOnServer,
    deleteRelationshipOnServer
  }
}

export { saveFunctionsMixin }

