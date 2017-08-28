let app = new Vue({
  el: '#app',

  data: {
    usuarios: [],
    email: '',
    identificacion: '',
    nombre: ''
  },

  methods: {
    buscarIdentificacion: function () {
      let identificacion = this.identificacion
      let url = `http://mh-cpd-qaphwb/servicios/ObtenerMetadatos.cshtml?identificacion=${identificacion}`

      $.get(url, ((data) => {
        let json = JSON.parse(data)
        this.nombre = json.n
      }).bind(this))
    }
  }

})