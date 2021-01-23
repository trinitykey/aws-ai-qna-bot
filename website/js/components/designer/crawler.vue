<template lang="pug">
  v-dialog(v-model='dialog' persistent max-width='50%')
    template
      v-btn.block(flat slot="activator") Kendra Web Page Indexer
    v-card(id="alexa-modal")
      v-card-title(primary-title)
        .headline Kendra Web Page Indexer
      v-card-text
        p Current Stats {{status}}
      v-card-actions
        v-btn( 
          @click="start"
        ) Start Indexing
      v-card-actions
        v-spacer
        v-btn(@click='dialog = false') Close
</template>

<script>
/*
Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file
except in compliance with the License. A copy of the License is located at

http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS"
BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the
License for the specific language governing permissions and limitations under the License.
*/

var Vuex=require('vuex')
var Promise=require('bluebird')
var _=require('lodash')
var Promise=require('bluebird')

module.exports={
  data:function(){
    var self=this
    return {
      status: {},
      dialog: false,
      text:false,
      ready:false
    }
  },
  components:{
  },
  computed:{
    
  },
  updated:function(){
    console.log("created");
    var self = this;
    this.getKendraIndexingStatus().then((data) => {
      self.status = data.Status;
     } );
  },
  methods:{
    start:async function(){
      this.$store.dispatch('api/startKendraIndexing').catch((err) => console.log(`error while trying to start indexing ` + err ))

    },
    getKendraIndexingStatus: async function(){
      var result = await this.$store.dispatch("api/getKendraIndexingStatus")
      return result;
  
  },
  }
}
</script>

<style lang='scss' scoped>
</style>

